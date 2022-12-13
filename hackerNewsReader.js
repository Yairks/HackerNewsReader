const axios = require("axios");
const http = require('http');
let fs = require("fs"); /* Module for file reading */
const express = require("express");   /* Accessing express module */
const path = require("path");
const bodyParser = require("body-parser"); /* To handle post parameters */
const { MongoClient, ServerApiVersion } = require('mongodb');

require("dotenv").config({ path: path.resolve(__dirname, '.env') })

// MongoDB initialization
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const rapid_api_key = process.env.RAPID_API_KEY;

const databaseAndCollection = { db, collection };
const uri = `mongodb+srv://${userName}:${password}@cluster0.skujjp6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function insertLogin(client, databaseAndCollection, newApplication) {
  const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newApplication);
}

async function lookUpLogin(client, databaseAndCollection, email, password) {
  let filter = { email, password };
  const result = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .findOne(filter);

  if (result) {
    return result;
  } else {
    null;
  }
}

const topStoryOptions = {
  method: 'GET',
  url: 'https://community-hacker-news-v1.p.rapidapi.com/topstories.json',
  params: { print: 'pretty' },
  headers: {
    'X-RapidAPI-Key': 'c1c202befcmsh2dab5714e585a87p17d0e1jsnf9f1f43bfe59',
    'X-RapidAPI-Host': 'community-hacker-news-v1.p.rapidapi.com'
  }
};

async function getTopStories() {
  const response = await axios.request(topStoryOptions);

  const topStories = [];
  for (i = 0; i < 10; i++) {
    const itemOptions = {
      method: 'GET',
      url: `https://community-hacker-news-v1.p.rapidapi.com/item/${response.data[i]}.json`,
      params: { print: 'pretty' },
      headers: {
        'X-RapidAPI-Key': 'c1c202befcmsh2dab5714e585a87p17d0e1jsnf9f1f43bfe59',
        'X-RapidAPI-Host': 'community-hacker-news-v1.p.rapidapi.com'
      }
    };

    topStories.push((await axios.request(itemOptions)).data);
  }

  return topStories;
}

async function main() {

  try {
    await client.connect();

  } catch (e) {
    console.error(e);
  }

  app.listen(portNumber);
  console.log(`Web server started and running at port ${portNumber}`);

  process.stdout.write("Type stop to shutdown the server: ");
  process.stdin.setEncoding("utf8"); /* encoding */
  process.stdin.on('data', async (dataInput) => {  /* on equivalent to addEventListener */
    if (dataInput !== null) {
      let command = dataInput.trim();
      if (command === "stop") {
        console.log("Shutting down the server");
        await client.close();
        process.exit(0);  /* exiting */
      } else {
        /* After invalid command, we cannot type anything else */
        console.log(`Invalid command: ${command}`);
      }

      process.stdout.write("Type stop to shutdown the server: ");
    }
  });
}

const portNumber = 5000;
const app = express();  /* app is a request handler function */
app.use(bodyParser.urlencoded({ extended: false }));

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));
app.use(express.static(path.join(__dirname, 'public')));

/* view/templating engine */
app.set("view engine", "ejs");

app.get("/", (request, response) => {
  /* Generating the HTML */
  response.render("index");
});

app.get("/signup", (request, response) => {
  /* Generating the HTML */
  response.render("signup.ejs");
});

app.post("/processSignup", async (request, response) => {
  let { firstname, lastname, email, password } = request.body;

  await insertLogin(client, databaseAndCollection, {
    firstname, lastname, email, password
  });

  /* Generating the HTML */
  response.render("processSignup", { firstname, lastname, email });
});

app.get("/login", (request, response) => {
  /* Generating the HTML */
  response.render("login.ejs");
});

app.post("/processLogin", async (request, response) => {
  let { email, password } = request.body;

  const result = await lookUpLogin(client, databaseAndCollection, email, password);


  if (result == null) {
    response.render("failedLogin");
  } else {
    const { firstname, lastname } = result;

    const topStories = await getTopStories();
    response.render("successfulLogin", {
      firstname, stories: "<table border=\"1\"><tr><th>Top Articles</th><th>Discussion</th></tr>" + topStories.reduce((acc, curr) => (acc + "<tr><td><a href=\"" + curr.url + "\">" + curr.title + "</a></td><td><a href=\"https://news.ycombinator.com/item?id=" + curr.id + "\">https://news.ycombinator.com/item?id=" + curr.id + "</a></td></tr>"), "") + "</table>"
    });
  }

});

main().catch(console.error);