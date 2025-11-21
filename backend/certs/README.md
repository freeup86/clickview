# SSL/TLS Certificates

This directory stores CA (Certificate Authority) certificates for secure database connections.

## Why This Matters

For enterprise deployments, proper SSL/TLS certificate verification prevents man-in-the-middle attacks and ensures your data remains secure in transit.

## Setup Instructions

### For Aiven PostgreSQL

1. Download the Aiven CA certificate:
   ```bash
   curl -o ca-certificate.crt https://docs.aiven.io/docs/platform/howto/download-ca-cert
   ```

2. Save it to this directory as `ca-certificate.crt`

3. Restart your backend server

### For AWS RDS

1. Download the RDS CA bundle:
   ```bash
   curl -o ca-certificate.crt https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   ```

2. Save it to this directory

### For Azure Database

1. Download from Azure Portal:
   - Navigate to your PostgreSQL server
   - Go to "Connection security"
   - Download the SSL certificate

2. Save as `ca-certificate.crt`

### For Google Cloud SQL

1. Download from Google Cloud Console:
   - Navigate to your Cloud SQL instance
   - Go to "Connections" > "Security"
   - Download server CA certificate

2. Save as `ca-certificate.crt`

## Custom Certificate Path

Set a custom path via environment variable:

```bash
DATABASE_SSL_CA_PATH=/path/to/your/certificate.crt
```

## Local Development

For local PostgreSQL without SSL, add `?sslmode=disable` to your DATABASE_URL:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/db?sslmode=disable
```

## Security Best Practices

✅ **DO:**
- Use SSL/TLS in production
- Verify certificates (rejectUnauthorized: true)
- Keep CA certificates updated
- Use strong cipher suites

❌ **DON'T:**
- Disable certificate verification in production
- Use self-signed certificates in production
- Commit certificates to version control (add to .gitignore)
- Share certificates across environments

## Troubleshooting

**Error: "self signed certificate"**
- Download and configure the proper CA certificate for your provider

**Error: "unable to verify the first certificate"**
- Ensure the CA certificate is for the correct database server
- Check that the certificate hasn't expired

**Connection timeout**
- Verify firewall rules allow SSL connections
- Check that SSL is enabled on the database server
