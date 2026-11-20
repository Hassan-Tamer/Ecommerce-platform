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

## AI & Intelligence
Chatbot [ ]
Recommendation [ ]
Review Summarizer [ ]
Semantic search [ ]

## Admin Portal 
Populate products [x]
CRUD for products [ ]
Pagination [ ] 
MinIO [ ]
Redis [ ]
Dashboard [ ]

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