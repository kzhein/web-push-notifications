const subscribeAgain = async options => {
  const subscription = await self.registration.pushManager.subscribe(options);

  await fetch('/.netlify/functions/app/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: {
      'content-type': 'application/json',
    },
  });
};

self.addEventListener('push', event => {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'favicon.png',
      image: data.image,
    })
  );
});

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(subscribeAgain(event.oldSubscription.options));
});
