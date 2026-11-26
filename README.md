# Alimama

A signed-in storefront and staff desk: catalog, cart, coupons, cash-on-delivery checkout, and a shop assistant that looks up products and orders and hands the browser buttons to change them.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-SQLAlchemy_2-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-5-DC382D?logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.5-37814A?logo=celery&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-S3-C72E49?logo=minio&logoColor=white)

Search the catalog, open a product, add it to the cart, apply `WELCOME10`, and place the order.

![Purchase path](assets/hero.gif)

## Features



### Catalog

Home (`/`) lists active products with category chips, a debounced name search, min/max price, and sort (`id`, `name`, `price_asc`, `price_desc`). Cards show the average rating. "Load more" follows an opaque cursor.

- `GET /products` accepts `q`, `category_slug`, `min_price`, `max_price`, `sort`, `cursor`, and `limit` (default 24, max 100).
- The cursor is a URL-safe base64 JSON key of the last row (`id`, plus `price` or `name` when those sorts are active). The next page uses a strict tuple comparison so ties stay stable.
- `GET /products/categories` feeds the chips. Stock and `stock_alert_at` are included only when the caller is an admin; public responses drop those fields (`response_model_exclude_none`).
- Review averages are aggregated in SQL and attached to each page of products.



### Product page

`/products/:slug` shows the gallery, price, description, and reviews. Signed-in shoppers can add the item to the cart or wishlist and post a rating.

- `GET /products/slug/{slug}` reads Redis first (`catalog:product:slug:{slug}`, TTL `CATALOG_PRODUCT_SLUG_TTL_SECONDS`, default 300). A Redis error is treated as a miss. Admin writes delete the key.
- The cached payload always stores stock; the view strips it for non-admins.
- `GET /products/{id}` is the uncached lookup the assistant card uses.



### Cart

`/cart` is per user. Quantity edits and removals hit the API. A coupon field previews the discount and stores the code for checkout.

- `cart_items` uses `(user_id, product_id)` as the primary key.
- `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{product_id}`, `DELETE /cart/items/{product_id}`.
- Adds and quantity changes reject inactive products and quantities above `stock_quantity` (409).
- Celery beat runs `tasks.delete_stale_carts` every day at 01:30. A cart is stale when `max(updated_at)` for that user is older than 7 days; the job deletes every line for those users.



### Coupons

Percent or fixed codes, with an optional window, minimum subtotal, max discount (percent only), global usage limit, and per-user limit. `WELCOME10` is 10% off with no floor.

- `POST /cart/coupon` checks the code against the current cart subtotal and returns subtotal, discount, and total. It does not redeem the code.
- The browser keeps the accepted code in `sessionStorage` (`checkout_coupon_code`) and sends it on `POST /orders`.
- Redemption is a `coupon_redemptions` row tied 1:1 to the order, written in the same transaction as the order. 
- Admin CRUD is `GET|POST|PATCH|DELETE /admin/coupons`. Codes are stored uppercased.



### Checkout

`/checkout` prefills street, city, apartment, floor, and phone from the profile. Payment on this screen is cash on delivery: the order is created as `pending` and no card is stored or charged. Shipping from the UI is `0`.

- `POST /orders` requires `Idempotency-Key` (the client sends `crypto.randomUUID()`). A repeat key for the same user returns the existing order with 200; the first insert returns 201. The unique key is `(user_id, idempotency_key)`.
- The handler snapshots `product_name` and `unit_price` onto `order_items`, copies the address into a JSONB column, decrements stock, records the coupon redemption, and deletes the cart. A unique-violation on the idempotency key rolls back and returns the winning row.
- Insufficient stock or an inactive product returns 409 and leaves the cart in place.



### Orders

`/orders` lists the signed-in user's orders. Each row shows status, total, the address snapshot, and a step list. `shipped` and `delivered` also show a drawn route. That graphic is a fixed SVG on the page, not a live location.

- `GET /orders` and `GET /orders/{id}` are scoped to `user_id`. Another user's id returns 404.
- Status values in the database: `pending`, `paid`, `shipped`, `delivered`, `cancelled`. The shop labels them Placed, Packing, Out for delivery, Delivered, and Cancelled.
- Checkout always inserts `pending`.



### Wishlist

`/wishlist` ("Saved" in the header) stores one row per user and product.

- `GET /wishlist`, `PUT /wishlist/{product_id}`, `DELETE /wishlist/{product_id}`.
- The table primary key is `(user_id, product_id)`, so a second save is a no-op conflict rather than a duplicate row.



### Reviews

A product page lists reviews newest-first and lets a signed-in user post a 1–5 rating with an optional title and body. Posting again updates that user's review.

- `GET /products/slug/{slug}/reviews` and `POST /products/slug/{slug}/reviews`.
- Unique `(user_id, product_id)` plus `CHECK (rating BETWEEN 1 AND 5)`.
- List pagination is a cursor of `(created_at, id)` descending.
- `DELETE /admin/reviews/{id}` removes a review. The shop UI does not expose that action.



### Announcements

The shop home rotates active announcements whose window includes now, three at a time, every 8 seconds. Reduced motion stops the rotation.

- `GET /announcements` filters `active`, `starts_at`, and `ends_at`.
- Order is a fractional-index `sort_key` (`fractional-indexing`), so a reorder writes one row instead of renumbering the table. Admin create and patch take a `sort_order` index and the service generates the key between neighbors.
- Admin CRUD is under `/admin/announcements`. The desk UI edits them on `/admin`.



### Account

Register and sign in issue an access token and set a refresh cookie. The account page edits name, phone, and address, and uploads a profile photo. Email cannot be changed from `PATCH /auth/me`.

- Passwords are Argon2id hashes (`argon2-cffi`).
- Access JWT (HS256, default 30 minutes) carries `sub`, `email`, `role`, `jti`, and `type=access`. The React app keeps it in memory. `localStorage` keys from an older build are removed on load and are not written.
- Refresh JWT (default 7 days) is stored only as a SHA-256 hash in `refresh_tokens`. The raw token is an `HttpOnly`, `SameSite=Lax` cookie named `refresh_token`, path `/auth`. `POST /auth/refresh` revokes the presented row and issues a new pair. `POST /auth/logout` revokes it and clears the cookie.
- `POST /auth/register` queues a welcome email on FastAPI `BackgroundTasks` after the response is committed. The template is `notifications/templates/register_hello.html`. Failures are logged and do not fail registration.
- `POST /auth/me/photo` stores a JPEG, PNG, WebP, or GIF up to 5 MB in MinIO at `avatars/{user_id}/…` and saves the object key on `users.photo`. Replacing a photo deletes the previous object.
- Limits, keyed by client IP in Redis: register and login `10/minute`, refresh and logout `30/minute`, `GET /auth/me` `60/minute`, profile patch `30/minute`, photo upload `10/minute`. Excess requests return 429 `{"detail":"Too many requests"}`.



### Shop desk

`/admin` is visible in the nav only when `user.role === "admin"`. It shows today's orders and revenue, month revenue, active product count, the low-stock list, recent orders, coupons, and announcements. Restock adds units through the stock endpoint.

- `GET /admin/summary` counts non-cancelled orders since 00:00 UTC, sums their totals for today and for the month, counts active products, and returns up to 10 active products with `stock_quantity <= stock_alert_at` (default alert is 5).
- `GET /admin/orders?limit=` returns recent orders (1–100, default 20) with the customer name.
- `PATCH /admin/products/{id}/stock` adds stock from the desk.
- Admin routes depend on `get_current_admin`: the JWT `role` claim and `users.role` must both be `admin`.

![Shop desk](assets/shop-desk.png)

### Product admin

`/admin/products` creates and edits products, including images. Delete deactivates the row (`is_active = false`) so old order lines can still point at it. `/admin/inventory` redirects here.

- `GET|POST /admin/products`, `GET|PATCH /admin/products/{id}`, `DELETE /admin/products/{id}`.
- Create and update are multipart: fields plus up to 12 images, each JPEG, PNG, WebP, or GIF and at most 8 MB. Objects land at `products/{product_id}/…` in the `product-images` bucket.
- Writes invalidate the slug cache, including the old slug if it changed.



### Shop assistant

The panel is on every signed-in page. It answers in short Markdown and can attach buttons. Product buttons render a card from `GET /products/{id}` (photo, name, price). Cart and wishlist buttons call the same APIs as the rest of the UI. A `navigate` action routes to orders, wishlist, shop, or account.

![Shop assistant](assets/assistant.gif)

## Getting started

### Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Create the database, then set `DATABASE_URL` and `JWT_SECRET_KEY` in `backend/.env`. Example TCP URL:

```text
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/ecommerce
```

Peer auth on Linux (no password) is the commented alternative in `.env.example`. Set `GROQ_API_KEY` for live assistant replies. For the scripted assistant prompts, set `LLM_DEMO_MODE=true` and restart the API.

`frontend/.env` only needs `VITE_API_URL=http://127.0.0.1:8000`. Restart Vite after changing it.

### Services

```bash
docker run -d --name mailpit \
  -p 8025:8025 -p 1025:1025 \
  axllent/mailpit

docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine

docker run -d --name minio \
  -p 9001:9000 -p 9002:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v minio_data:/data \
  cgr.dev/chainguard/minio:latest server /data --console-address ":9001"
```

### API, worker, and storefront

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

In a second terminal, same virtualenv:

```bash
cd backend && PYTHONPATH=. celery -A app.tasks.celery_app:celery_app worker --beat --loglevel=info
```

```bash
cd frontend
npm install
npm run dev
```



### Seed data

From `backend/`, with `PYTHONPATH=.`:

```bash
python scripts/seeding/seed_catalog.py --reset -n 100
python scripts/seeding/seed_coupons.py
python scripts/seeding/seed_announcements.py
python scripts/seeding/seed_reviews.py
python scripts/seeding/seed_orders.py
```

That loads:

- 100 products across men's clothing, women's clothing, jewelery, electronics, and extra categories. The first rows come from `scripts/seeding/seed_products.json`; the rest are generated names. A default seed includes `Wireless Noise-Cancelling Headphones — Edition 4`, which demo mode uses for the headphones prompt.
- Coupons: `WELCOME10` (10%), `SAVE15` (15% above 25, max 30), `FLAT20` (20 off above 75), `WEEKEND25` (25% above 50, max 50, one use per user, 100 total, one-week window), `LABOR5` (inactive).
- 10 announcements.
- Reviewer accounts `seed-reviewer-1@reviews.example.local` through `seed-reviewer-30@reviews.example.local`, password `seed-reviewer-pass`, and several reviews per product.
- Orders for the first five customer users (those reviewers, if reviews are seeded first): two orders each, statuses cycling through pending, paid, shipped, delivered, and cancelled.

Register a shopper in the UI for a clean account. The welcome email shows up in Mailpit. Promote a desk user in SQL, then sign in again so the access token picks up `role=admin`:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```



## Project structure

```text
backend/
  alembic/                 migrations
  app/
    main.py                FastAPI app and routers
    auth/                  register, JWT, refresh cookie, profile photo
    products/              catalog, cursor pages, slug cache, admin CRUD
    cart/  wishlist/  orders/  coupons/  reviews/  announcements/
    assistant/             ADK agent, OpenAPI tools, demo-mode scripts
    notifications/         SMTP transport and the welcome template
    storage/               MinIO client
    cache/                 Redis client
    tasks/                 Celery app and stale-cart job
    db/                    models, session, config
  scripts/seeding/         catalog, coupons, announcements, reviews, orders
  scripts/set_minio_bucket_public.py
frontend/
  src/pages/               shop, product, cart, checkout, orders, account, desk
  src/components/          layout, assistant panel, announcements
  src/features/            API clients and auth, cart, and wishlist context
```

