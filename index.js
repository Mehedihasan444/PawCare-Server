// const jwt = require("jsonwebtoken");
// const cookieParser=require('cookie-parser')
const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// ==========middleware===========
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yzoz4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rjhcvof.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// ssl commerz cresentials
const store_id = process.env.storeID;
const store_passwd = process.env.storePasswd;
const is_live = false; //true for live, false for sandbox 

// Create a MongoClient with a MongoClientOptions object to set the Stable API version==
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const products = client.db("PawCare").collection("products");
    const cart = client.db("PawCare").collection("cart");
    const users = client.db("PawCare").collection("users");
    const medicine = client.db("PawCare").collection("medicine");
    const adopt = client.db("PawCare").collection("adopt");
    // =================== adopt crud operations =======================
    app.post("/adopt", async (req, res) => {
      const course = req.body;
      const result = await adopt.insertOne(course);
      res.send(result);
    });
    app.get("/adopt", async (req, res) => {
      const result = await adopt.find().toArray();
      res.send(result);
    });
    app.get("/adopt/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await adopt.findOne(query);
      res.send(result);
    });
    // =================== products crud operations ======================
    app.post("/all-products", async (req, res) => {
      const course = req.body;
      const result = await products.insertOne(course);
      res.send(result);
    });
    app.get("/all-products", async (req, res) => {
      const result = await products.find().toArray();
      res.send(result);
    });
    app.get("/all-products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.findOne(query);
      res.send(result);
    });
    app.get("/products/:categories", async (req, res) => {
      const categories = req.params.categories;
      const query = { category: categories };
      const result = await products.find(query).toArray();
      res.send(result);
    });
    app.get("/all-products/:email", async (req, res) => {

      const email = req.params.email;
      const query = { email: email };
      const result = await products.find(query).toArray();
      res.send(result);
    });
    // get all medicine added by individual user
    app.get("/medicine/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "author.author_email": email };
      const result = await medicine.find(query).toArray();
      console.log(result)
      res.send(result);
    });
    // post a course
    app.post("/medicine", async (req, res) => {
      const course = req.body;
      const result = await medicine.insertOne(course);
      console.log(result)
      res.send(result);
    });

    // get a specific course
    app.get("/users/medicine/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await medicine.findOne(query);
      res.send(result);
    });

    // Get all medicine
    app.get("/medicine", async (req, res) => {
      const result = await medicine.find().toArray();
      res.send(result);
    });

    // cart post operation
    app.post("/cart", async (req, res) => {
      const item = req.body;
      const { _id, ...rest } = item;
      const query = { title: rest.title, email: rest.email };
      const isExist = await cart.findOne(query);
      if (isExist) {
        return res.send({ message: "already exists" });
      }

      const result = await cart.insertOne(rest);
      res.send(result);
    });

    // get cart items based on user email
    app.get("/cart/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await cart.find(query).toArray();

      res.send(result);

    });
    // delete items from cart
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cart.deleteOne(query);
      console.log(result)
      res.send(result);
    });

    // delete a course
    app.delete("/admin/medicine/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await medicine.deleteOne(query);
      res.send(result);
    });
    // delete a products
    app.delete("/admin/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.deleteOne(query);
      res.send(result);
    });
    // post user info
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await users.insertOne(user);
      res.send(result);
    });

    // get user info
    app.get("/admin/users", async (req, res) => {

      const result = await users.find().toArray();
      res.send(result);
    });
    // get user info
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await users.findOne(query);
        if (!result) {
          return res.status(404).send({ message: 'User not found' });
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error finding user' });
      }
    });

    // for payment
    app.post("/payment", async (req, res) => {
      const tran_id = new ObjectId().toString();
      const id = new ObjectId().toString();

      const cartItem = req.body;
      const email = cartItem.userEmail;
      const medicine = cartItem.medicine; // No need to spread here, assuming medicine is an array

      // New properties to add to each course
      const newProperties = {
        purchase: false,
        payment: false,
      };

      // Destructure the original array and add new properties to each object
      const modifiedArray = medicine?.map((obj) => {
        // Destructure the object and add new properties
        return {
          ...obj, // Spread the original properties
          ...newProperties, // Add new properties
        };
      });

      // Assuming id is defined somewhere else
      const result = await users.updateOne(
        { email: email },
        {
          $addToSet: { // Use $addToSet to add unique elements to an array
            purchaseList: { $each: modifiedArray }
          }
        }
      );

      const data = {
        total_amount: cartItem?.total_bill,
        currency: "BDT",
        tran_id: tran_id,
        success_url: `http://localhost:5000/user/payment/success/${tran_id}?email=${email}`,
        fail_url: `http://localhost:5000/user/payment/fail/${tran_id}?email=${email}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Food",
        product_category: "Mix category",
        product_profile: "general",
        cus_name: "cartItem?.userName",
        cus_email: "cartItem?.userEmail",
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/user/payment/success/:tranId", async (req, res) => {
        const result = await users.updateOne(
          {
            email: req.query.email,
            purchaseList: {
              $elemMatch: {
                purchase: false,
                payment: false,
              },
            },
          },
          {
            $set: {
              "purchaseList.$.purchase": true,
              "purchaseList.$.payment": true,
              transactionId: req.params.tranId,
            },
          }
        );
        if (result.modifiedCount > 0) {
          res.redirect(
            `http://localhost:5173/payment-complete/${req.params.tranId}`
          );
        }

        const cartIds = await cart.find().toArray();
        const ids = cartIds.map((x) => x._id);
        const query = { _id: { $in: ids } };
        await cart.deleteMany(query);
      });
      app.post("/user/payment/fail/:tranId", async (req, res) => {


        res.redirect(
          `http://localhost:5173/payment-failed/${req.params.tranId}`
        );

      });
    });

    // checking whether a user admin or not 
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
        role: "admin",
      };
      const result = await users.findOne(query);
      if (result) {
        res.send({ admin: true });
      } else {
        res.send({ admin: false });
      }

    });
    // delete a user
    app.delete("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await users.deleteOne(query);
      res.send(result);
    });

    // make a user admin
    app.patch("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await users.updateOne(filter, updatedDoc);
      res.send(result);
    });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    //
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Backend is running");
});
app.listen(port, () => {
  console.log(`backend is running on port ${port}`);
});


app.use("*", (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.originalUrl
  });
  next(error);
});


// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});