# DocuSign offer automation

The admin portal sends a DocuSign envelope when an administrator clicks **Send offer contract** for an application in the interview stage.

The application advances to `offer` only after DocuSign accepts the envelope and the portal records its envelope ID. Connect webhook events then update the contract status shown in the admin profile.

## 1. Apply the database migration

Run this file in the Supabase SQL Editor:

```text
docs/sql/migrations/2026-07-29_add_docusign_offer_contracts.sql
```

It creates `application_contracts`, its RLS policies, and the `record_docusign_offer` transactional function.

## 2. Prepare the DocuSign template

In DocuSign:

1. Open **Templates** and create the Yonde Labs offer contract.
2. Add a recipient role named exactly `Student`.
3. Place every required signature, date, initial, and text tab on the document.
4. If a guardian must also sign, add a role such as `Guardian` and choose its routing order.
5. Save the template and copy its template ID.

The role names are case-sensitive and must match `DOCUSIGN_STUDENT_ROLE` and `DOCUSIGN_GUARDIAN_ROLE`.

## 3. Create API credentials

Use a DocuSign developer account first.

1. Open **Apps and Keys** for the API user.
2. Create or select an integration.
3. Copy the Integration Key, API User ID, and Account ID.
4. Add an RSA key pair and securely copy the private key.
5. Grant the integration one-time JWT consent for the `signature` and `impersonation` scopes.

Never commit the private key or add it to a `NEXT_PUBLIC_*` variable.

## 4. Add Vercel environment variables

Add the values listed in `.env.example` under **Vercel > Project Settings > Environment Variables**.

For the DocuSign demo environment:

```text
DOCUSIGN_AUTH_SERVER=account-d.docusign.com
```

After DocuSign production approval, use:

```text
DOCUSIGN_AUTH_SERVER=account.docusign.com
```

`DOCUSIGN_GUARDIAN_ROLE` is optional. When it is configured, the sender requires valid `parent_name` and `parent_email` fields in the application.

## 5. Configure Connect

In **DocuSign Admin > Connect (Webhooks)**:

1. Open **Connect Keys** and create an HMAC key.
2. Store that key in Vercel as `DOCUSIGN_CONNECT_HMAC_KEY`.
3. Add an account configuration with this public URL:

```text
https://yondelabs.com/api/docusign/connect
```

4. Select JSON/REST notifications.
5. Enable the envelope events: Sent, Delivered, Completed, Declined, and Voided.
6. Enable HMAC signing and activate the configuration.

The webhook rejects unsigned or incorrectly signed requests.

## 6. Test

1. Redeploy the Vercel project after adding variables.
2. Move a test application into the Interview stage.
3. Open its admin profile and click **Send offer contract**.
4. Confirm the recipient receives the DocuSign email.
5. Confirm `applications.status` becomes `offer`.
6. Confirm `application_contracts` contains the envelope ID.
7. Open and sign the test envelope, then confirm the admin contract card changes to Completed.

If DocuSign sends the envelope but the portal cannot record it, the API returns the envelope ID and tells the administrator not to retry. Use that envelope ID to reconcile the record before sending another contract.
