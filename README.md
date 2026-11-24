## Auth

auth/me [x]
email_sending [x]
rate limit [x]
oauth [ ]
oidc [ ]
SSO [ ]
reset password [ ]
email verification [ ]

## Logging

Propper logging [ ]
Observability [ ]

## AI & LLM

Shop assistant UI (frontend mock) [x]
`POST /assistant/messages` — shopper message in, reply out [ ]
Assistant scoped to catalog + signed-in user's orders [ ]
LLM provider wiring (model, API keys, timeouts) [ ]
Optional prompt / tool layer for product lookup and order status [ ]
Optional `assistant_messages` persistence (`user_id`, `role`, `body`, `created_at`) [ ]
Chatbot (broader than shop assistant) [ ]
Recommendation [ ]
Review summarizer [ ]
Semantic search [ ]

## Admin Portal

Populate products [x]
CRUD for products [ ]
Pagination [x] 
MinIO [x]
Redis [x]
Dashboard [ ]

## Shop screens — backend TODO

Frontend account, cart, checkout, reviews, coupons, assistant, and admin flows are mocks (`alert` / in-memory cart). Wishlist uses the API. Details: [docs/frontend-backend-needs.md](docs/frontend-backend-needs.md).

### Account

User profile: `phone`, `avatar_url` (or MinIO object key) [ ]
Address table: `street`, `city`, `region`, `postal_code` (one per user) [ ]
`GET /auth/me` — `role`, phone, address, avatar [ ]
`PATCH /auth/me` — name, phone [ ]
`PUT /auth/me/address` [ ]
`POST /auth/me/photo` (MinIO, public URL) [ ]

### Cart

`carts` + `cart_items` (or browser-only until checkout — decide) [ ]
`GET /cart`, `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}` [ ]
Guest cart: none (signed-out → `/login`) [ ]

### Wishlist

`wishlist_items` (`user_id` + `product_id` PK) [x]
`GET /wishlist`, `PUT /wishlist/{product_id}`, `DELETE /wishlist/{product_id}` [x]

### Checkout & orders

`orders` + `order_items` (price snapshot at purchase) [ ]
`POST /orders` from cart (clear cart) [ ]
`GET /orders`, `GET /orders/{id}` [ ]
`payment_method`: `cash` | `card` (no stored card number; provider charge id) [ ]

### Coupons

`coupons` + `coupon_redemptions` [ ]
`POST /cart/coupon` — validate code, return new total [ ]

### Reviews

`reviews` (`user_id` + `product_id` unique, rating 1–5) [ ]
`GET /products/slug/{slug}/reviews` [ ]
`POST /products/slug/{slug}/reviews` [ ]
`PATCH` / `DELETE` for author [ ]

### Admin

`POST /admin/products`, `PATCH /admin/products/{id}`, delete/deactivate [ ]
Product image upload (URL list on product) [ ]
`GET /admin/inventory`, `POST /admin/inventory/{id}` (`stock`, `alert_at`) [ ]
`GET /admin/summary` (orders today, revenue, product count, low stock) [ ]
`GET /admin/orders` (recent orders) [ ]
Admin UI gated on JWT `role` === `admin` [ ]

### Orders & tracking

Order statuses: `placed`, `packing`, `shipped`, `out_for_delivery`, `delivered` [ ]
`GET /orders/{id}/tracking` — `{ lat, lng, updated_at }` while out for delivery [ ]

### Announcements

`announcements` model + `GET /announcements` (shop) [x]

 `POST` / `PATCH` / `DELETE /admin/announcements` [x]

## Important commands

Seed catalog (100 products):

```
egrobots
cd backend && PYTHONPATH=. python scripts/seeding/seed_catalog.py --reset -n 100
```

SMTP server: 

```
docker run -d --name mailpit \
  -p 8025:8025 -p 1025:1025 \
  axllent/mailpit
```

REDIS

```
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

MinIO (S3 API on host :9001, console :9002 — create bucket `product-images`, then optional public read for dev)

```
docker run -d --name minio \
    -p 9001:9000 -p 9002:9001 \
    -e MINIO_ROOT_USER=minioadmin \
    -e MINIO_ROOT_PASSWORD=minioadmin \
    -v minio_data:/data \
    cgr.dev/chainguard/minio:latest server /data --console-address ":9001"
```

