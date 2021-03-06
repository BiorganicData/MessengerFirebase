<img src="https://related.chat/relatedchat/header1.png">

<img src="https://related.chat/relatedchat/pricing1.png">

<img src="https://related.chat/relatedchat/product2.png">

# Installation instructions

## Setup the Google Cloud Platform resources

1., Ensure you have a [Google Cloud Platform](https://console.cloud.google.com) account with a linked billing account (with [less than 5 projects](https://console.cloud.google.com/billing/manage) associated with it)

2., Open [Google Cloud Console with a Cloud Shell instance](https://console.cloud.google.com/home/dashboard?cloudshell=true)

3., Copy paste this command into the console:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/relatedcode/MessengerFirebase/main/deployment.sh)"
```

4., **Accept all the prompts generated by the console** during the setup process and wait until it is complete

5., A `key.json` file will be downloaded to your computer at the end of the setup process

## Setup GitHub repository

1., Fork this repository

2., Select the **_Settings_** in the top navigation bar

3., Select the **_Secrets_** menu on the sidebar

4., Create the following repository secret

- `GCP_SA_KEY` -> copy the content of the `key.json` file

## Deploy the code to Firebase

1., Select the **_Actions_** in the top navigation bar

2., Click on **_Deploy Related:Chat_** workflow

3., Click on the dropdown button **_Run workflow_**

4., Click on **_Run workflow_**

5., Wait until the deployment process is finished

6., Your **Related:Chat** project is now ready to use 🎉🎉🎉

## Final thoughts

You can find the public URL of your Web app in the [Firebase Console](https://console.firebase.google.com) **_Hosting_** menu. By default, Firebase generates two links. Click on one of them to see your live Web app.

You may experience some loading time during the first few minutes because the Firebase infrastructure needs some time to warm up.

---

© Related Code 2022 - All Rights Reserved
