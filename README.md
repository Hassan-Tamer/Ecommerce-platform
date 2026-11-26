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
`POST /assistant/messages` — shopper message in, reply out [x]  
Assistant scoped to catalog + signed-in user's orders [ ]  
LLM provider wiring (model, API keys, timeouts) [x]  
Optional prompt / tool layer for product lookup and order status [ ]  
Optional `assistant_messages` persistence (`user_id`, `role`, `body`, `created_at`) [ ]  
Chatbot (broader than shop assistant) [ ]  
Recommendation [ ]  
Review summarizer [ ]  
Semantic search [ ]

mcp [ ]

### Announcements

`announcements` model + `GET /announcements` (shop) [x]

 `POST` / `PATCH` / `DELETE /admin/announcements` [x]

### Wishlist

`wishlist_items` (`user_id` + `product_id` PK) [x] 

`GET /wishlist`, `PUT /wishlist/{product_id}`, `DELETE /wishlist/{product_id}` [x]

## Admin Portal

Populate products [x] CRUD for products [x] Pagination [x]  MinIO [x] Redis [x] Dashboard [x]

## Shop screens — backend TODO

Frontend account, cart, checkout, reviews, coupons, assistant, and admin flows are mocks (`alert` / in-memory cart). Wishlist uses the API. Details: [docs/frontend-backend-needs.md](docs/frontend-backend-needs.md).

### Account

User profile columns on `users`: `phone`, `photo` (MinIO object key), `street`, `city`, `apartment_number`, `floor` [x]
`GET /auth/me` — name, email, phone, public photo URL, street, city, apartment number, floor [x]
`PATCH /auth/me` — name, phone, address fields; email rejected; photo via upload only [x]
`POST /auth/me/photo` — multipart upload to MinIO, object key in DB [x]

### Cart

`cart_items` (`user_id` + `product_id` PK) [x]  
`GET /cart`, `POST /cart/items`, `PATCH /cart/items/{product_id}`, `DELETE /cart/items/{product_id}` [x]

Delete stale carts in a background job [x]

### Checkout & orders

`orders` + `order_items` (price snapshot at purchase) [x]

 `POST /orders` from cart (clear cart) [x] 

`GET /orders`, `GET /orders/{id}` [x] 

`payment_method`: `cash` | `card` (no stored card number; provider charge id) [x]

### Coupons

`coupons` table [x]  
`POST /cart/coupon` — validate code, return subtotal / discount / total [x]  
`GET|POST|PATCH|DELETE /admin/coupons` [x]  
`coupon_redemptions` (on order place) [x]

admin add a coupon [x]

### Reviews

`reviews` (`user_id` + `product_id` unique, rating 1–5) [x]
`GET /products/slug/{slug}/reviews` [x]
`POST /products/slug/{slug}/reviews` [x]
`DELETE /admin/reviews/{id}` [x]

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

Celery worker and beat (deletes carts last touched more than 7 days ago, every day at 01:25 in `CELERY_TIMEZONE`, otherwise the host timezone):

```
cd backend && PYTHONPATH=. celery -A app.tasks.celery_app:celery_app worker --beat --loglevel=info
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

celery -A app.tasks.celery_app:celery_app worker --beat --loglevel=info