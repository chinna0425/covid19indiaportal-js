const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
let db = null;
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const initializationofdbandserver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB error is ${error.message}`);
    process.exit(1);
  }
};

initializationofdbandserver();

// API 1 LOGIN

// API GET

let middlewareFunction = async (request, response, next) => {
  let authheader = request.headers["authorization"];
  let jwtTokenval;
  if (authheader !== undefined) {
    jwtTokenval = authheader.split(" ")[1];
  }
  if (jwtTokenval === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    let check = jwt.verify(jwtTokenval, "chinna", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

let convertinto = (res) => {
  let myarray = [];
  for (let i = 0; i < res.length; i++) {
    myarray.push({
      stateId: res[i].state_id,
      stateName: res[i].state_name,
      population: res[i].population,
    });
  }
  return myarray;
};

app.get("/states/", middlewareFunction, async (request, response) => {
  let query = `
    select * from state;`;
  let queryres = await db.all(query);
  response.send(convertinto(queryres));
});

//API GET

app.get("/states/:stateId/", middlewareFunction, async (request, response) => {
  let { stateId } = request.params;
  let query = `
    select * from state where state_id=${stateId};`;
  let resu = await db.get(query);
  response.send({
    stateId: resu.state_id,
    stateName: resu.state_name,
    population: resu.population,
  });
});

//API /districts/

app.post("/districts/", middlewareFunction, async (request, response) => {
  let { districtName, stateId, cases, cured, active, deaths } = request.body;
  let searchquery = `
  select * from district where district_name='${districtName}';`;
  let res1 = await db.get(searchquery);
  if (res1 === undefined) {
    let query = `
    insert into district( district_name,
  state_id,
  cases,
  cured,
  active,
  deaths) values('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
    await db.run(query);
    response.send("District Successfully Added");
  } else {
    response.send("Already there");
  }
});

//API /districts/:districtId/ GET

app.get(
  "/districts/:districtId/",
  middlewareFunction,
  async (request, response) => {
    let { districtId } = request.params;
    let query = `
    select * from district where district_id=${districtId};`;
    let res1 = await db.get(query);
    response.send({
      districtId: res1.district_id,
      districtName: res1.district_name,
      stateId: res1.state_id,
      cases: res1.cases,
      cured: res1.cured,
      active: res1.active,
      deaths: res1.deaths,
    });
  }
);

//API /districts/:districtId/ DELETE

app.delete(
  "/districts/:districtId/",
  middlewareFunction,
  async (request, response) => {
    let { districtId } = request.params;
    let query = `
    delete from district where district_id=${districtId};`;
    await db.run(query);
    response.send("District Removed");
  }
);

app.put(
  "/districts/:districtId/",
  middlewareFunction,
  async (request, response) => {
    let { districtId } = request.params;
    let { districtName, stateId, cases, cured, active, deaths } = request.body;
    let query = `
    update district set district_name='${districtName}',state_id='${stateId}',
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths} where district_id=${districtId};`;
    await db.run(query);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  middlewareFunction,
  async (request, response) => {
    let { stateId } = request.params;
    let query = `
    select sum(cases) as totalCases,sum(cured) as totalCured,
    sum(active) as totalActive,sum(deaths) as totalDeaths from district where state_id=${stateId};`;
    let res = await db.get(query);
    response.send({
      totalCases: res.totalCases,
      totalCured: res.totalCured,
      totalActive: res.totalActive,
      totalDeaths: res.totalDeaths,
    });
  }
);

app.post("/login/", async (request, response) => {
  let { username, password } = request.body;

  let query = `
    select * from user where username='${username}';`;
  let queryres = await db.get(query);
  if (queryres === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let istrueorfalse = await bcrypt.compare(password, queryres.password);
    if (istrueorfalse === true) {
      let payload = {
        username: username,
      };
      let jwtToken = jwt.sign(payload, "chinna");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
