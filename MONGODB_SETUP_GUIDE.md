# 🌐 How to Connect to MongoDB Atlas (Free Database)

To make your game save user data and history, follow these steps to get a free MongoDB link.

## Step 1: Create an Account
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2.  Sign up (it's free, no credit card required).
3.  Choose **Shared > Free Tier**.
4.  Select a provider (AWS) and region (closest to you).
5.  Click **Create Cluster**.

## Step 2: Create a Database User
1.  Go to **Database Access** under "Security" on the left.
2.  Click **Add New Database User**.
3.  **Username**: `admin` (or whatever you like).
4.  **Password**: `password123` (make it strong!).
5.  Click **Add User**.
    *   *Remember this username and password!*

## Step 3: Network Access (Allow IP)
1.  Go to **Network Access** under "Security".
2.  Click **Add IP Address**.
3.  Click **Allow Access from Anywhere** (`0.0.0.0/0`).
    *   *This ensures you can connect from anywhere.*
4.  Click **Confirm**.

## Step 4: Get Connection String
1.  Go back to **Database** (left menu).
2.  Click **Connect** on your cluster.
3.  Choose **Drivers**.
4.  You will see a string like:
    ```
    mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
    ```
5.  **Copy this string**.

## Step 5: Update Your Project
1.  Open `.env` file in your project.
2.  Paste the string into `MONGO_URI`.
3.  Replace `<username>` with your user (e.g. `admin`).
4.  Replace `<password>` with your password.
    *   *Remove the `< >` brackets!*
5.  Save the file.

---

### Example
If your password is `supersecure`, your `.env` should look like:
```env
MONGO_URI=mongodb+srv://admin:supersecure@cluster0.abcde.mongodb.net/boardgames?retryWrites=true&w=majority
```

## Step 6: Test Connection
Run this command in your terminal:
```bash
node scripts/test_db.js
```
(I will create this script for you next!)
