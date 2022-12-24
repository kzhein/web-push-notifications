const mongoose = require('mongoose');

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

module.exports = Subscription;
