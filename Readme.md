# CS4218 Project - Virtual Vault

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:
   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:
     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:
   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:
   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:
   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:
   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:
   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**
   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
     ```bash
     git clone <repository_url>
     ```
   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**
   - Run the following command in your project's root directory:

     ```
     npm install && cd client && npm install && cd ..
     ```

3. **Add database connection string to `.env`**
   - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
     ```env
     MONGO_URL = <connection string>
     ```

4. **Adding sample data to database**
   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:
   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **All the tests**
     ```bash
     npm run test
     ```

## 6. Testing Scope Breakdown

This section outlines the distribution of files and testing for our team. Our team followed the suggested testing scope given by Prof. and split the workload by "Features" column. Each member would then be in charge of all files listed under that particular feature.

### AGRAWAL SHAURYAN A0265846N

I implemented and fixed the bugs in the Authentication, Authorization helpers, login, registration, and middleware modules, wrote **80 automated unit tests**, and achieved **100% statement, branch, function, and line coverage across all components under my ownership** (MS1). I built 61 backend integration tests using real MongoDB/bcrypt/JWT via MongoMemoryServer and 40 Playwright end-to-end UI tests covering authentication flows and admin dashboard access control, discovering and fixing 4 additional bugs invisible to unit testing (MS2).

| Features                                  | Client Related Files                                         | Server Related Files                                                                                                                           |
| :---------------------------------------- | :----------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication (Login & Registration)** | `pages/Auth/Login.js`<br>`pages/Auth/Register.js`            | **`controllers/authController.js`**<br>1. `registerController`<br>2. `loginController`<br>3. `forgotPasswordController`<br>4. `testController` |
| **Authentication Helpers**                | —                                                            | **`helpers/authHelper.js`**<br>1. `hashPassword`<br>2. `comparePassword`                                                                       |
| **Authorization Middleware**              | —                                                            | **`middlewares/authMiddleware.js`**<br>1. `requireSignIn`<br>2. `isAdmin`                                                                      |
| **Admin Dashboard UI**                    | `components/AdminMenu.js`<br>`pages/admin/AdminDashboard.js` | —                                                                                                                                              |
| **Authentication Context**                | `context/auth.js`                                            | —                                                                                                                                              |

#### Integration & UI Tests (MS2)

- Integration tests (61 tests total):
  - `controllers/authController.register.integration.test.js` (19 tests)
  - `controllers/authController.login.integration.test.js` (18 tests)
  - `controllers/authController.forgotPassword.integration.test.js` (15 tests)
  - `controllers/authController.auth.e2e.integration.test.js` (9 tests)
- UI tests (40 tests total):
  - `tests/auth.spec.ts` (24 tests)
  - `tests/admin-dashboard.spec.ts` (16 tests)
- Bug fix (implemented during UI testing):
  - `client/src/pages/Auth/ForgotPassword.js` — created missing Forgot Password page discovered during Playwright E2E testing
 
#### Non-Functional Testing — Load Testing (MS3)

I designed and implemented **8 load test scripts** using Grafana k6, generating **343,981 HTTP requests** with over **1.3 million functional assertions** across all critical endpoint areas of the e-commerce application. Each script validates both performance metrics (response time, throughput, error rate) and payload structural integrity (JSON fields, data types, correct status codes) under sustained concurrent load up to 800 peak VUs.

| Test Suite | Endpoints Covered | Script File |
| :--- | :--- | :--- |
| **Authentication** | `/login`, `/register`, `/forgot-password`, duplicate registration collision | `load-testing/story1_authentication.load.test.js` |
| **Product Browsing** | `/product-list/:page`, `/get-product/:slug`, `/search/:keyword`, `/product-filters`, `/product-category/:slug` | `load-testing/story2_product_browsing.load.test.js` |
| **Category Management** | `/get-category`, `/create-category`, `/update-category/:id`, mixed read/write | `load-testing/story3_category_management.load.test.js` |
| **Profile & Orders** | `/user-auth`, `/profile`, `/orders` | `load-testing/story4_profile_orders.load.test.js` |
| **Mixed Workload** | All operations combined at 500 VUs (product list, detail, search, filter, login, orders, profile, category CRUD) | `load-testing/story5_mixed_workload.load.test.js` |
| **Payment Checkout** | `/braintree/token`, `/braintree/payment`, order verification pipeline | `load-testing/story6_payment_checkout.load.test.js` |
| **Photo Retrieval** | `/product-photo/:id` (hotspot + distributed access patterns) | `load-testing/story7_photo_retrieval.load.test.js` |
| **Resource Stability** | 10-minute sustained mixed workload at 300 VUs with post-load recovery validation | `load-testing/story8_resource_stability.load.test.js` |

- Shared test infrastructure:
  - `load-testing/config.js` — base URL, admin credentials, JSON headers
  - `load-testing/utils.js` — JSON parsing, random selection, unique ID generation, authentication/admin/product/category extraction helpers
- Performance bug identified (MS3):
  - **Product detail query degradation** — `GET /api/v1/product/get-product/:slug` averaged 8,686ms under 200 concurrent users due to Mongoose `.populate("category")` triggering secondary DB lookups per request under concurrent load

---

### CHIA YORK LIM A0258147X

I was responsible for testing and fixing the bugs in the following files.
| Features | Client Related Files | Server Related Files | Integration Files | UI Files |
| :--- | :--- | :--- | :--- | :--- |
|**Home**| <ul><li>`pages/Homepage.js` (`pages/Homepage.test.js`) </ul> | - | - | `pages/Homepage.js` (`tests/Homepage.spec.js`) |
|**Cart**| <ul><li>`context/cart.js` (`context/cart.test.js`) <li> `pages/CartPage.js` (`pages/CartPage.test.js`)</ul> | - | - | `pages/CartPage.js` (`test/CartPage.spec.ts`) |
|**Category**| <ul><li>`hooks/useCategory.js` (`hooks/useCategory.test.js`) <li> `pages/Categories.js` (`pages/Categories.test.js`) </ul> | <ul> <li>`controllers/categoryController.js` (`controllers/categoryController.test.js`) <ul> <li> categoryControlller <li> singleCategoryController </ul> <li> `models/categoryModel.js` (`models/categoryModel.test.js`) </ul> | `controllers/categoryController.js` (`controllers/categoryController.integration.test.js`) | `pages/Categories.js` (`tests/Categories.spec.ts`) |
|**Payment**| - | <ul> <li>`controllers/productController.js` (`controllers/productController.payment.test.js`) <ul> <li> braintreeTokenController <li> brainTreePaymentController </ul> | `controllers/productController.js` (`controllers/productController.payment.integration.test.js`) | - |

NFT Testing (Capacity)

- AuthRoute
  - /login `k6\authRoute.login.k6.capacity.js`
  - /orders `k6\authRoute.order.k6.capacity.js`
  - /forgot-password `k6\authRoute.forgot-password.k6.capacity.js`
  - /register `k6\authRoute.register.k6.capacity.js`
- CategoryRoute
  - /get-category `k6\categoryRoute.get-category.k6.capacity.js`
- ProductRoute
  - /get-product/:slug `k6\productRoute.get-product-slug.k6.capacity.js`
  - /product-photo/:pid `k6\productRoute.product-photo.k6.capacity.js`
  - /product-filter `k6\productRoute.product-filter.k6.capacity.js`
  - /product-list/:page `k6\productRoute.product-list.k6.capacity.js`
  - /search/:keyword `k6\productRoute.search.k6.capacity.js`
  - /braintree/payment `k6\productRoute.braintree-payment.k6.capacity.js`

### JONAS ONG SI WEI A0252052U

#### Unit Tests (MS1)

I was responsible the following test files under the following categories (unit test for the following files ends with .test.js):
| Features | Client Related Files | Server Related Files |
| :--- | :--- | :--- |
| **Admin Actions** | `components/Form/CategoryForm.js`<br>`pages/admin/CreateCategory.js`<br>`pages/admin/CreateProduct.js`<br>`pages/admin/UpdateProduct.js` | **`categoryController.admin.test.js`** for **`controllers/categoryController.js`**<br>1. `createCategoryController`<br>2. `updateCategoryController`<br>3. `deleteCategoryController`
| **Admin View Orders** | `pages/admin/AdminOrders.js` | N/A
| **Admin View Products** | `pages/admin/Products.js` | **`productController.admin.test.js`** for **`controllers/productController.js`**<br>1. `createProductController`<br>2. `updateProductController`<br>3. `deleteProductController`
| **Admin General** | `components/Routes/Private.js`<br>`components/UserMenu.js`<br>`pages/user/Dashboard.js`<br> | N/A

#### Integration & UI Tests (MS2)

- Integration tests:
  - `controllers/categoryController.admin.integration.test.js`
  - `controllers/productController.admin.integration.test.js`

- UI tests:
  - `tests/CreateCategory.spec.ts`
  - `tests/CreateProduct.spec.ts`
  - `tests/UpdateProduct.spec.ts`
  - `tests/AdminOrders.spec.ts`
  - `tests/Dashboard.spec.ts`
  - `tests/Products.spec.ts`

### TAN QIN YONG A0253468W

I was in charge of these files and all unit tests for them (unit test files ends with fileName.test.js).

| Features               | Client Related Files                                                                                                                                 | Server Related Files                                                                                                                                                                                                                                                                                                                                                       |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product Management** | `pages/ProductDetails.js`<br>`pages/CategoryProduct.js`                                                                                              | **`controllers/productController.js`**<br>1. `getProductController`<br>2. `getSingleProductController`<br>3. `productPhotoController`<br>4. `productFiltersController`<br>5. `productCountController`<br>6. `productListController`<br>7. `searchProductController`<br>8. `realtedProductController`<br>9. `productCategoryController`<br><br>**`models/productModel.js`** |
| **Contact & Support**  | `pages/Contact.js`                                                                                                                                   | N/A                                                                                                                                                                                                                                                                                                                                                                        |
| **Legal & Policy**     | `pages/Policy.js`                                                                                                                                    | N/A                                                                                                                                                                                                                                                                                                                                                                        |
| **General & Layout**   | `components/Footer.js`<br>`components/Header.js`<br>`components/Layout.js`<br>`components/Spinner.js`<br>`pages/About.js`<br>`pages/Pagenotfound.js` | N/A                                                                                                                                                                                                                                                                                                                                                                        |

#### Integration & UI Tests (MS2)

- Integration tests:
  - `controllers/productController.product.integration.test.js`

- UI tests:
  - `tests/categoryProduct.spec.ts`
  - `tests/productDetails.spec.ts`
  - `tests/header.spec.ts` |

#### NFR Testing - Stress Tests(MS2)

- Auth
  - /login & /register `k6\auth.k6.stress.js`
  - /orders `k6\orders.k6.stress.js`

- Category
  - /get-category `k6\category.stress.js`

- Product
  - /get-product/:slug `k6\product.view.k6.stress.js`
  - /product-photo/:pid `k6\product.view.k6.stress.js`
  - /product-filter `k6\product.filter.k6.stress.js`
  - /product-list/:page `k6\product.browse.k6.stress.js`
  - /search/:keyword `k6\product.search.k6.stress.js`
  - /braintree/payment `k6\payment.k6.stress.js`

### TENG HUI XIN ALICIA A02590646Y

MS1
I was in charge of the following sections and all the unit tests for them. For Client related files, it would be name.test.js. For server related files, it would authController.NAME.test.js.
| Features | Client Related Files | Server Related Files |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Order** | `pages/user/Orders.js ` | **`controllers/authController.js`**<br>1. `updateProfileController`<br>2. `getOrdersController`<br>3. `getAllOrdersController` <br>4. `orderStatusController` <br>5. `getAllUsersController`|
| **Profile** | `pages/user/Profile.js` | N/A |
| **Admin View Users** | `pages/admin/Users.js` | N/A |
| **Search** | `components/Form/SearchInput.js`<br>`pages/Search.js` | N/A

MS2
I was incharge of the following files.

Integration Testing:

- `authController.getAllUsersController.integration.test.js`
- `authController.ordersController.integration.test.js`
- `authController.updateProfileController.integration.test.js`

UI Testing:

- `admin-users.spec.ts`
- `search.spec.ts`
- `user-orders.spec.ts`
- `user-profile.spec.ts`

## 7. MS1 CI URL

https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team14/actions/runs/22282697634
