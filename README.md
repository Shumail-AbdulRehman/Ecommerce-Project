# 🛍️ Nazara – Full Stack E-commerce Website

Nazara is a modern full-stack e-commerce web application featuring a premium UI and a scalable backend architecture.  
It demonstrates real-world functionalities such as authentication, order management, email notifications, and smart search.

---

## 🌐 Live Demo
🔗 https://nazara-shop.vercel.app

---

## ⚙️ Tech Stack

### Frontend
- React.js
- Context API
- Custom Hooks
- CSS / Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB / Mongoose

### Tools & Services
- Vercel (Frontend Deployment)
- Render (Backend Deployment)
- Brevo SMTP / HTTP Email API
- Cash on Delivery checkout

---

## ✨ Features

- 🔐 User Authentication (Signup/Login with OTP)
- 🛒 Shopping Cart & Checkout System
- 📦 Order Management System
- 🚚 Order Status Tracking  
  *(Pending → Dispatched → Out for Delivery → Delivered)*
- 📧 Automated Email Notifications (Order Updates)
- 🔍 Smart Search (Suggestions + History)
- ⚡ Optimized Performance & Error Handling

---

## 📸 Screenshots

### 🏠 Home Page
<img width="1901" height="912" alt="image" src="https://github.com/user-attachments/assets/e55f1d00-dffb-4fd7-846a-27dc610aa306" />


### 🛍️ Products Page
<img width="1903" height="911" alt="image" src="https://github.com/user-attachments/assets/beadfb9b-fab6-41f9-a64b-6aef36e17dfb" />


### 📦 Orders Dashboard
<img width="1907" height="914" alt="image" src="https://github.com/user-attachments/assets/cd361326-5899-4ccd-a642-87a558a030ec" />


---

## 📁 Project Structure

```
ecommerce/
│
├── backend/
│ ├── config/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ ├── utils/
│ └── server.js
│
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── hooks/
│ │ ├── context/
│ │ └── App.jsx
```


---

## ⚡ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/RohitV33/Nazara-E-Commerce
```
### 2. Setup Backend
```
        cd backend
        npm install
        npm run seed-catalog
        npm run create-admin
        npm run dev
```
###  3. Setup Frontend
 ```
        cd frontend
        npm install
        npm run dev
```
### 🔐 Environment Variables
```
Create a .env file inside the backend folder:

PORT=5000
DB_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
BREVO_API_KEY=your_brevo_api_key
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_smtp_login
SMTP_PASS=your_brevo_smtp_password
SMTP_FROM_EMAIL=your_verified_brevo_sender@example.com
SMTP_FROM_NAME=Nazara Store
SUPPORT_EMAIL=support@example.com
ADMIN_EMAIL=shumail1@gmail.com
ADMIN_PASSWORD=replace_with_a_strong_admin_password
ADMIN_NAME=Nazara Admin
```

Create a .env file inside the frontend folder:

```
VITE_API_URL=https://your-backend-domain.com/api
```

For local development, use:

```
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000/api
```
### 🚀 Future Improvements


* 📱 Mobile Responsiveness Improvements
* 🧑‍💼 Admin Dashboard
* 📊 Analytics & Reporting

### 🙌 Author

Rohit Verma

* GitHub: https://github.com/RohitV33
* LinkedIn: https://linkedin.com/in/rawhit01

### ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!
  
