require('dotenv').config();
const express = require('express');
const path = require('path');
const webpush = require('web-push');
const mongoose = require('mongoose');

const start = async () => {
  // Example subscription object
  // {
  //   endpoint: 'https://fcm.googleapis.com/fcm/send/fsdsfwefwesfsfsd',
  //   expirationTime: null,
  //   keys: {
  //     p256dh: 'fsdufsdkfkw4534nfdsf',
  //     auth: 'fdskafldsfk3459345',
  //   },
  // }
  const Subscription = mongoose.model(
    'Subscription',
    new mongoose.Schema({
      endpoint: {
        type: String,
        required: true,
        unique: true,
      },
      expirationTime: {
        type: String,
      },
      keys: {
        p256dh: {
          type: String,
          required: true,
        },
        auth: {
          type: String,
          required: true,
        },
      },
    })
  );

  mongoose.set('strictQuery', false);
  await mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;

  webpush.setVapidDetails(
    'mailto:mail@someEmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const app = express();

  app.use(express.static(path.join(__dirname, 'public')));

  app.use(express.json());

  app.get('/vapid-public-key', (req, res) => {
    res.status(200).send(VAPID_PUBLIC_KEY);
  });

  app.post('/subscribe', async (req, res) => {
    const subscription = req.body;

    const isSubscribed = await Subscription.findOne({
      endpoint: subscription.endpoint,
    });

    // Already subscribed
    if (isSubscribed) {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: 'You have already subscribed',
          body: 'Although we appreciate you trying to again',
        })
      );
      return res.status(201).json({ message: 'Already subscribed!' });
    }

    // Subscribing for the first time
    await Subscription.create(subscription);

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'Thank you for Subscribing!',
        body: "It's pretty cool",
      })
    );

    return res.status(201).json({ message: 'Subscribed for the first time!' });
  });

  app.post('/unsubscribe', async (req, res) => {
    const subscription = req.body;

    await Subscription.deleteOne({
      endpoint: subscription.endpoint,
    });

    return res.status(200).json({ message: 'Unsubscribed!' });
  });

  app.post('/send-notifications', async (req, res) => {
    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'No title or body!' });
    }

    const subscriptions = await Subscription.find();

    const resultsPromises = subscriptions.map(subscription =>
      webpush.sendNotification(
        subscription,
        JSON.stringify({
          title,
          body,
        })
      )
    );

    const results = await Promise.allSettled(resultsPromises);

    // Remove subscription if it has been cancelled or expired
    const expiredEndpoints = [];
    results.forEach(result => {
      if (result.status === 'rejected' && result.reason.statusCode === 410) {
        expiredEndpoints.push(result.reason.endpoint);
      }
    });

    if (expiredEndpoints.length > 0) {
      await Subscription.deleteMany({
        endpoint: expiredEndpoints,
      });
    }

    return res.status(200).json({ message: 'notification sent' });
  });

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch(err => {
  console.error(err);
});
