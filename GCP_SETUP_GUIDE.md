# Google Cloud Platform Setup Guide for OAuth 2.0 and Secret Manager

This guide will walk you through the necessary steps to configure your Google Cloud Platform (GCP) project to support Google OAuth 2.0 for the memo application and securely manage its secrets using Secret Manager. This setup is crucial for the GitHub Actions workflow to deploy your application to Cloud Run.

## 1. Create OAuth 2.0 Credentials

Your application needs OAuth 2.0 credentials to authenticate users via their Google accounts.

1.  **Navigate to Credentials:**
    *   Open the [GCP Console](https://console.cloud.google.com/).
    *   Select your project.
    *   Go to "APIs & Services" > "Credentials".

2.  **Create OAuth Client ID:**
    *   Click on "+ CREATE CREDENTIALS" at the top of the page.
    *   Select "OAuth client ID" from the dropdown.

3.  **Configure OAuth Client ID:**
    *   **Application type:** Choose "Web application".
    *   **Name:** Give your OAuth client ID a descriptive name (e.g., "Memo App Client" or "Cloud Run Memo App").
    *   **Authorized JavaScript origins:**
        *   Click "+ ADD URI".
        *   Enter the URL of your Cloud Run service (e.g., `https://memo-app-xxxxxx-uc.a.run.app`).
        *   **Note:** You might need to deploy a placeholder version of your service to Cloud Run first to obtain this URL. You can also add it later by editing the OAuth client ID.
    *   **Authorized redirect URIs:**
        *   Click "+ ADD URI".
        *   Enter your Cloud Run service URL followed by `/auth/google/callback`. For example: `https://memo-app-xxxxxx-uc.a.run.app/auth/google/callback`. This must exactly match the `callbackURL` configured in your application and the one registered here.

4.  **Save and Note Credentials:**
    *   Click "CREATE".
    *   A dialog will appear showing your **Client ID** and **Client Secret**.
    *   **Important:** Copy these values immediately and store them temporarily in a secure location. You will need them for the next step. You can always view the Client ID later, but the Client Secret is only shown once.

## 2. Store Secrets in Secret Manager

You will use Google Cloud Secret Manager to securely store your OAuth credentials and the session secret for your application.

1.  **Navigate to Secret Manager:**
    *   In the GCP Console, go to "Security" > "Secret Manager". (You can use the search bar at the top).

2.  **Create Secrets:**
    You need to create three secrets. For each secret:
    *   Click "+ CREATE SECRET".
    *   **Name:** This is the name of the secret **in Secret Manager**. This is the name you will use in your `deploy.yml` workflow file (e.g., `YOUR_GOOGLE_CLIENT_ID_SECRET_NAME`).
        *   Example names: `memo-app-google-client-id`, `memo-app-google-client-secret`, `memo-app-session-secret`.
    *   **Secret value:** Paste the corresponding value.
    *   Leave "Replication policy" as "Automatic" unless you have specific needs.
    *   Click "CREATE SECRET".

    *   **Secret 1: Google Client ID**
        *   **Name:** Use the name you've decided for your `deploy.yml` (e.g., `memo-app-google-client-id`).
        *   **Secret value:** Paste the "Client ID" you obtained in the previous section.

    *   **Secret 2: Google Client Secret**
        *   **Name:** Use the name you've decided for your `deploy.yml` (e.g., `memo-app-google-client-secret`).
        *   **Secret value:** Paste the "Client Secret" you obtained in the previous section.

    *   **Secret 3: Session Secret**
        *   **Name:** Use the name you've decided for your `deploy.yml` (e.g., `memo-app-session-secret`).
        *   **Secret value:** Generate a strong, random string. You can use a password manager or a command like `openssl rand -base64 32` in your terminal. This secret is used to sign session cookies.

## 3. Grant Service Account Access to Secrets

The service account used by your GitHub Actions workflow (via Workload Identity Federation) needs permission to access these secrets from Secret Manager when deploying to Cloud Run.

For each of the three secrets you created (`memo-app-google-client-id`, `memo-app-google-client-secret`, `memo-app-session-secret`):

1.  **Go to the Secret:**
    *   In Secret Manager, click on the name of the secret.

2.  **Open Permissions Tab:**
    *   Select the "Permissions" tab (you might need to click "View details" or similar first if it's not immediately visible).

3.  **Add Principal:**
    *   Click "+ ADD PRINCIPAL" or "GRANT ACCESS".
    *   **New principals:** Enter the email address of the service account that GitHub Actions will use. This is the service account you configure in your `deploy.yml` workflow (e.g., `your-github-actions-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com`).
    *   **Assign roles:** In the "Select a role" dropdown, search for and select "Secret Manager Secret Accessor".
    *   Click "SAVE".

Repeat these steps for all three secrets.

## 4. Workload Identity Federation (Recap & Permissions)

Your GitHub Actions workflow uses Workload Identity Federation (WIF) to securely authenticate to Google Cloud without needing to export service account keys. Ensure this is correctly set up:

1.  **WIF Configuration:**
    *   You should have a Workload Identity Pool and a Provider configured in your GCP project's IAM & Admin section.
    *   The Provider should be linked to your GitHub repository.
    *   The service account (e.g., `your-github-actions-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com`) should be grantable to identities from this WIF pool for your specific GitHub repository/branch.

2.  **Service Account IAM Roles:**
    The service account used by WIF needs the following IAM roles in your GCP project:
    *   **Secret Manager Secret Accessor:** (You granted this per-secret above. Alternatively, you could grant it at the project level if the SA only handles this app, but per-secret is more granular).
    *   **Cloud Run Admin (`roles/run.admin`):** To deploy new revisions, update service configuration, etc.
    *   **Artifact Registry Writer (`roles/artifactregistry.writer`):** To push Docker images to Google Artifact Registry.
    *   **Service Account User (`roles/iam.serviceAccountUser`):** This role must be granted **to the WIF principal** on the service account itself. This allows the WIF identity (e.g., `principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/YOUR_POOL_ID/subject/repo:YourOrg/YourRepo:ref:refs/heads/main`) to impersonate the service account.

## 5. Enable Required APIs

Ensure the following APIs are enabled in your GCP project. You can enable them by navigating to "APIs & Services" > "Library", searching for the API, and clicking "Enable".

*   **Cloud Run API:** For deploying and managing your application.
*   **Artifact Registry API:** For storing and managing Docker images.
*   **Secret Manager API:** For accessing secrets.
*   **IAM Service Account Credentials API (`iamcredentials.googleapis.com`):** Required for Workload Identity Federation to allow the impersonation of service accounts. (Often enabled by default).
*   **Identity and Access Management (IAM) API (`iam.googleapis.com`):** Generally enabled by default.

After completing these steps, your GCP project will be configured, and your GitHub Actions workflow should be ableto securely deploy the memo application to Cloud Run, using the credentials stored in Secret Manager. Remember to replace all placeholder values in your `deploy.yml` file with the actual names and IDs from your GCP setup.
