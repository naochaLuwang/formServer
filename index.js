const express = require("express");
const cors = require("cors");
let cron = require("node-cron");
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const mongoose = require("mongoose");
require("dotenv").config();
const MessageMaster = require("./models/MessageMaster");
const path = require("path");
const fs = require("fs");
const FormFeedback = require("./models/FormFeedback");

// const fetch = (...args) =>
//   import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
// middleware
app.use(cors());
app.use(express.json());

const MONGODB_URI =
  "mongodb+srv://naocha:naocha234@cluster0.xr2ih8t.mongodb.net/?retryWrites=true&w=majority";

let i = 0;

mongoose
  .connect(process.env.DB || MONGODB_URI)
  .then(() => {
    console.log("Connection successful");
  })
  .catch((err) => {
    console.log(err);
  });

cron.schedule("* * * * *", () => {
  console.log("running a task every minute", i++);

  emailScheduler();
});

const port = 5000;
const emailScheduler = async () => {
  const formFeedbacks = await FormFeedback.find({ status: "QUEUED" });

  if (formFeedbacks) {
    const filePath = path.join(__dirname, "./emails/feedback.html");
    const source = fs.readFileSync(filePath, "utf8").toString();
    const template = handlebars.compile(source);

    for (let i = 0; i < formFeedbacks.length; i++) {
      const replacements = {
        username: formFeedbacks[i].patient.name,
        type: formFeedbacks[i].patient.patientType,
        hospital: "Pratiksha Hospital",
        link: formFeedbacks[i].formUrl,
      };

      const htmlToSend = template(replacements);

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SENDER_EMAIL,
          pass: process.env.SENDER_PASSWORD,
        },
      });

      var mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: `${formFeedbacks[i].email}`,
        subject: `Feedback for ${formFeedbacks[i].formName}`,
        // text: "That was easy!",
        html: htmlToSend,
      };

      transporter.sendMail(mailOptions, async function (error, info, res) {
        if (error) {
          console.log(error);
        } else {
          await FormFeedback.findOneAndUpdate(
            { submittedBy: formFeedbacks[i].patient.primaryMobileNumber },
            {
              status: "SENT",
            }
          );
        }
      });
    }
  }

  const response = await MessageMaster.find({ status: "QUEUED" });

  if (response) {
    const filePath = path.join(__dirname, "./emails/template.html");
    const source = fs.readFileSync(filePath, "utf8").toString();
    const template = handlebars.compile(source);

    for (let i = 0; i < response.length; i++) {
      const replacements = {
        username: "Admin",
        message: response[i].message,
      };

      const htmlToSend = template(replacements);

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "relyform@gmail.com",
          pass: "aobiknsordvvtvuy",
        },
      });

      var mailOptions = {
        from: "relyform@gmail.com",
        to: "somoarambam123@gmail.com",
        subject: "Feedback Score alert",
        // text: "That was easy!",
        html: htmlToSend,
      };

      transporter.sendMail(mailOptions, async function (error, info, res) {
        if (error) {
          console.log(error);
        } else {
          await MessageMaster.findOneAndUpdate(
            { mobileNumber: response[i].mobileNumber },
            {
              status: "SENT",
            }
          );
        }
      });
    }
  }
};
app.get("/", (req, res) => {
  res.json({ message: "Hello" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
