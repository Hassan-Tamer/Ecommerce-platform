## Auth 
auth/me [x]
email_sending [x]
oauth [ ]
oidc [ ]
SSO [ ]
rate limit [ ]
reset password [ ]
email verification [ ]

## Importand commands

SMTP server: ```
docker run -d --name mailpit \
  -p 8025:8025 -p 1025:1025 \
  axllent/mailpit
  ```