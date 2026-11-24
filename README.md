# Airlines browser demo

Open the site and book a fictional flight from the default **Demo Profile**.
Choose a cabin and seats, enter fictional passenger details, and confirm a
simulated payment. Booking details include printable boarding passes and
scannable demo QR codes.

The profile includes upcoming flights, completed trips, cancellations, and full
booking history. Its settings include light, dark, and system appearance, display
currency, in-app notification preferences, and a confirmed history reset.

The site saves preferences, seat drafts, and bookings in `localStorage` for the
current browser profile and site address. The cream theme is the default.
Existing bookings from the previous browser version transfer to the Demo Profile.
Clearing history removes the stored trips and releases their demo seats.
A different browser or deployment address starts with a fresh profile.

## Run locally

```sh
npm ci
npm run dev
```

## Deploy on Vercel

Import this repository into Vercel. The included `vercel.json` builds the app with
`npm run build` and publishes the static `out/` folder. The demo requires no
database, account service, environment variables, or server functions.

To preview the same static output locally, run `npm run build` and then
`python3 -m http.server --directory out`.
