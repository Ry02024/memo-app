# Google Cloud Platform OAuth 2.0 および Secret Manager 設定ガイド

このガイドでは、メモアプリケーション用の Google OAuth 2.0 をサポートし、Secret Manager を使用してそのシークレットを安全に管理するように Google Cloud Platform (GCP) プロジェクトを設定するために必要な手順を説明します。この設定は、GitHub Actions ワークフローがアプリケーションを Cloud Run にデプロイするために不可欠です。

## 1. OAuth 2.0 認証情報を作成する

アプリケーションがユーザーの Google アカウント経由で認証するには、OAuth 2.0 認証情報が必要です。

1.  **認証情報に移動:**
    *   [GCP コンソール](https://console.cloud.google.com/)を開きます。
    *   プロジェクトを選択します。
    *   「API とサービス」>「認証情報」に移動します。

2.  **OAuth クライアント ID を作成:**
    *   ページ上部の「+ 認証情報を作成」をクリックします。
    *   ドロップダウンから「OAuth クライアント ID」を選択します。

3.  **OAuth クライアント ID を設定:**
    *   **アプリケーションの種類:** 「ウェブ アプリケーション」を選択します。
    *   **名前:** OAuth クライアント ID にわかりやすい名前を付けます (例: 「メモアプリクライアント」または「Cloud Run メモアプリ」)。
    *   **承認済みの JavaScript 生成元:**
        *   「+ URI を追加」をクリックします。
        *   Cloud Run サービスの URL を入力します (例: `https://memo-app-xxxxxx-uc.a.run.app`)。
        *   **注意:** この URL を取得するには、最初にサービスのプレースホルダー バージョンを Cloud Run にデプロイする必要がある場合があります。OAuth クライアント ID を編集して後で追加することもできます。
    *   **承認済みのリダイレクト URI:**
        *   「+ URI を追加」をクリックします。
        *   Cloud Run サービスの URL の後に `/auth/google/callback` を付けて入力します。例: `https://memo-app-xxxxxx-uc.a.run.app/auth/google/callback`。これは、アプリケーションで設定され、ここで登録された `callbackURL` と完全に一致する必要があります。

4.  **認証情報を保存してメモする:**
    *   「作成」をクリックします。
    *   **クライアント ID** と **クライアント シークレット** を示すダイアログが表示されます。
    *   **重要:** これらの値をすぐにコピーし、安全な場所に一時的に保存します。次のステップで必要になります。クライアント ID は後でいつでも表示できますが、クライアント シークレットは一度しか表示されません。

## 2. Secret Manager にシークレットを保存する

Google Cloud Secret Manager を使用して、OAuth 認証情報とアプリケーションのセッション シークレットを安全に保存します。

1.  **Secret Manager に移動:**
    *   GCP コンソールで、「セキュリティ」>「Secret Manager」に移動します。(上部の検索バーを使用できます)。

2.  **シークレットを作成:**
    3 つのシークレットを作成する必要があります。各シークレットについて:
    *   「+ シークレットを作成」をクリックします。
    *   **名前:** これは **Secret Manager 内の** シークレットの名前です。これは、`deploy.yml` ワークフロー ファイルで使用する名前です (例: `YOUR_GOOGLE_CLIENT_ID_SECRET_NAME`)。
        *   名前の例: `memo-app-google-client-id`、`memo-app-google-client-secret`、`memo-app-session-secret`。
    *   **シークレットの値:** 対応する値を貼り付けます。
    *   特定のニーズがない限り、「レプリケーション ポリシー」は「自動」のままにします。
    *   「シークレットを作成」をクリックします。

    *   **シークレット 1: Google クライアント ID**
        *   **名前:** `deploy.yml` 用に決定した名前を使用します (例: `memo-app-google-client-id`)。
        *   **シークレットの値:** 前のセクションで取得した「クライアント ID」を貼り付けます。

    *   **シークレット 2: Google クライアント シークレット**
        *   **名前:** `deploy.yml` 用に決定した名前を使用します (例: `memo-app-google-client-secret`)。
        *   **シークレットの値:** 前のセクションで取得した「クライアント シークレット」を貼り付けます。

    *   **シークレット 3: セッション シークレット**
        *   **名前:** `deploy.yml` 用に決定した名前を使用します (例: `memo-app-session-secret`)。
        *   **シークレットの値:** 強力なランダムな文字列を生成します。パスワード マネージャーを使用するか、ターミナルで `openssl rand -base64 32` などのコマンドを使用できます。このシークレットは、セッション Cookie の署名に使用されます。

## 3. サービス アカウントにシークレットへのアクセス権を付与する

GitHub Actions ワークフローで使用されるサービス アカウント (Workload Identity Federation 経由) には、Cloud Run へのデプロイ時に Secret Manager からこれらのシークレットにアクセスするためのアクセス許可が必要です。

作成した 3 つのシークレット (`memo-app-google-client-id`、`memo-app-google-client-secret`、`memo-app-session-secret`) のそれぞれについて:

1.  **シークレットに移動:**
    *   Secret Manager で、シークレットの名前をクリックします。

2.  **[権限] タブを開く:**
    *   [権限] タブを選択します (すぐに表示されない場合は、最初に [詳細を表示] などをクリックする必要がある場合があります)。

3.  **プリンシパルを追加:**
    *   「+ プリンシパルを追加」または「アクセス権を付与」をクリックします。
    *   **新しいプリンシパル:** GitHub Actions が使用するサービス アカウントのメール アドレスを入力します。これは、`deploy.yml` ワークフローで設定するサービス アカウントです (例: `your-github-actions-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com`)。
    *   **ロールを割り当て:** 「ロールを選択」ドロップダウンで、「Secret Manager のシークレット アクセサー」を検索して選択します。
    *   「保存」をクリックします。

これらの手順を 3 つすべてのシークレットに対して繰り返します。

## 4. Workload Identity Federation (概要と権限)

GitHub Actions ワークフローでは、Workload Identity Federation (WIF) を使用して、サービス アカウント キーをエクスポートする必要なく、Google Cloud に安全に認証します。これが正しく設定されていることを確認してください。

1.  **WIF 設定:**
    *   GCP プロジェクトの IAM と管理セクションで、Workload Identity プールとプロバイダーが設定されている必要があります。
    *   プロバイダーは GitHub リポジトリにリンクされている必要があります。
    *   サービス アカウント (例: `your-github-actions-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com`) は、特定の GitHub リポジトリ/ブランチのこの WIF プールからの ID に付与可能である必要があります。

2.  **サービス アカウントの IAM ロール:**
    WIF で使用されるサービス アカウントには、GCP プロジェクトで次の IAM ロールが必要です。
    *   **Secret Manager のシークレット アクセサー:** (上記でシークレットごとに付与しました。または、SA がこのアプリのみを処理する場合はプロジェクト レベルで付与することもできますが、シークレットごとがより詳細です)。
    *   **Cloud Run 管理者 (`roles/run.admin`):** 新しいリビジョンのデプロイ、サービス設定の更新など。
    *   **Artifact Registry 書き込み (`roles/artifactregistry.writer`):** Docker イメージを Google Artifact Registry にプッシュするため。
    *   **サービス アカウント ユーザー (`roles/iam.serviceAccountUser`):** このロールは、サービス アカウント自体で **WIF プリンシパルに** 付与する必要があります。これにより、WIF ID (例: `principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/YOUR_POOL_ID/subject/repo:YourOrg/YourRepo:ref:refs/heads/main`) がサービス アカウントを借用できるようになります。

## 5. 必要な API を有効にする

GCP プロジェクトで次の API が有効になっていることを確認します。「API とサービス」>「ライブラリ」に移動し、API を検索して「有効にする」をクリックすることで有効にできます。

*   **Cloud Run API:** アプリケーションのデプロイと管理用。
*   **Artifact Registry API:** Docker イメージの保存と管理用。
*   **Secret Manager API:** シークレットへのアクセス用。
*   **IAM Service Account Credentials API (`iamcredentials.googleapis.com`):** Workload Identity Federation がサービス アカウントの借用を許可するために必要です。(多くの場合、デフォルトで有効になっています)。
*   **Identity and Access Management (IAM) API (`iam.googleapis.com`):** 通常、デフォルトで有効になっています。

これらの手順を完了すると、GCP プロジェクトが設定され、GitHub Actions ワークフローは Secret Manager に保存されている認証情報を使用して、メモ アプリケーションを Cloud Run に安全にデプロイできるようになります。`deploy.yml` ファイル内のすべてのプレースホルダー値を、GCP 設定の実際の名前と ID に置き換えることを忘れないでください。
