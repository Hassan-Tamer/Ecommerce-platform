## Auth 
auth/me [x]
email_sending [x]
rate limit [x]
oauth [ ]
oidc [ ]
SSO [ ]
reset password [ ]
email verification [ ]

## Importand commands

SMTP server: ```
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