set -e

SERVICE_ACCOUNT_ID=github-action-$(openssl rand -hex 3)
REGION=europe-west

PROJECT_ID=relatedchat-$(openssl rand -hex 4)

# CREATE GCP PROJECT AND ADD FIREBASE SERVICES
echo "➡️ - Project $PROJECT_ID creation"
gcloud projects create $PROJECT_ID --name="RelatedChat"

gcloud config set project $PROJECT_ID

firebase projects:addfirebase $PROJECT_ID
echo "✅ - Project $PROJECT_ID creation"

# BILLING ACCOUNT SETUP
echo "➡️ - Billing account linking"
BILLING_ACCOUNT=$(gcloud beta billing accounts list --filter=open=true --format="value(name)" --limit=1)
gcloud beta billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT -q --verbosity="none"
echo "✅ - Billing account linking: $BILLING_ACCOUNT"

# ACTIVATE APPENGINE
echo "➡️ - AppEngine activation"
gcloud app create --region=$REGION --project=$PROJECT_ID -q --verbosity="none"
echo "✅ - AppEngine activation"

# ENABLE APIs
echo "➡️ - APIs activation"
gcloud services enable appengine.googleapis.com firestore.googleapis.com --project=$PROJECT_ID -q --verbosity="none"
echo "✅ - APIs activation"

# CREATE FIRESTORE DB
echo "➡️ - Firestore DB creation"
gcloud alpha firestore databases create --project=$PROJECT_ID --region=$REGION -q --verbosity="none"
echo "✅ - Firestore DB creation"

# FINALIZE DEFAULT LOCATION FOR FIREBASE PROJECT
echo "➡️ - Set default location for Firebase project"
curl -s -X POST "https://firebase.googleapis.com/v1beta1/projects/$PROJECT_ID/defaultLocation:finalize" \
-H "Authorization: Bearer "$(gcloud auth application-default print-access-token) \
-H 'Content-Type: application/json' \
-d '{"locationId": "'"$REGION"'"}' > /dev/null
echo "✅ - Set default location for Firebase project"

# CREATE A FIREBASE WEB APP
echo "➡️ - Create a Firebase Web App"
firebase apps:create web RelatedChatWeb --project=$PROJECT_ID
echo "✅ - Create a Firebase Web App"

# ACTIVATE FIREBASE AUTH
echo "➡️ - Activate Firebase Auth"
curl -s "https://mobilesdk-pa.googleapis.com/v1/projects/$PROJECT_ID:addAuthProduct" \
  -X 'POST' \
  -H "Authorization: Bearer "$(gcloud auth application-default print-access-token) > /dev/null

# ADD AUTH WITH EMAIL AND PASSWORD
curl -s "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired" \
  -X 'PATCH' \
  -H 'content-type: application/json' \
  -H "X-Goog-User-Project: $PROJECT_ID" \
  -H "Authorization: Bearer "$(gcloud auth application-default print-access-token) \
  -d '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}' > /dev/null
echo "✅ - Activate Firebase Auth"

# CREATE ADMIN SERVICE ACCOUNT AND CREATE A KEY
echo "➡️ - Create service account with role/owner permission"
gcloud iam service-accounts create $SERVICE_ACCOUNT_ID \
  --display-name=$SERVICE_ACCOUNT_ID \
  --project=$PROJECT_ID \
  --verbosity="none" -q

sleep 5

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/owner" \
  --verbosity="none" -q

gcloud iam service-accounts keys create ./key.json \
  --iam-account=$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --verbosity="none" -q
echo "✅ - Create service account with role/owner permission"

cloudshell download key.json

echo "\n🎉🎉🎉 RelatedChat project $PROJECT_ID has been successfully created 🎉🎉🎉"

echo "\n🎉🎉🎉 Your website will be available at https://$PROJECT_ID.web.app after the GitHub Actions deployment 🎉🎉🎉"

echo "\nIf the key.json file is not available of your computer, please run 'cloudshell download key.json' to download the file."