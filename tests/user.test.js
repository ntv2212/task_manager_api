const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = require("../src/app");
const User = require("../src/models/user");

const userTestId = new mongoose.Types.ObjectId();
const userTest = {
  _id: userTestId,
  name: "userTest",
  email: "userTest@example.com",
  password: "userTestPass",
  tokens: [
    {
      token: jwt.sign({ _id: userTestId }, process.env.JWT_SECRET),
    },
  ],
};

beforeEach(async () => {
  await User.deleteMany();
  await new User(userTest).save();
});

test("Should signup a new user", async () => {
  const response = await request(app)
    .post("/users")
    .send({
      name: "Vinh",
      email: "vinh@example.com",
      password: "vinhpass",
    })
    .expect(201);

  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();

  // expect(response.body.user.name).toBe("Vinh");
  expect(response.body).toMatchObject({
    user: {
      name: "Vinh",
      email: "vinh@example.com",
    },
    token: user.tokens[0].token,
  });

  expect(user.password).not.toBe("vinhpass");
});

test("Should login", async () => {
  const response = await request(app)
    .post("/users/login")
    .send({
      email: userTest.email,
      password: userTest.password,
    })
    .expect(200);

  const user = await User.findById(userTestId);
  expect(user.tokens[1].token).toBe(response.body.token);
});

test("Should not login nonexistent user", async () => {
  await request(app)
    .post("/users/login")
    .send({
      email: "a@example.com",
      password: "abcdefgh",
    })
    .expect(400);
});

test("Should get profile", async () => {
  await request(app)
    .get("/users/me")
    .set("Authorization", `Bearer ${userTest.tokens[0].token}`)
    .send()
    .expect(200);
});

test("Should not get profile for unauthenticated user", async () => {
  await request(app).get("/users/me").send().expect(401);
});

test("Should delete account for user", async () => {
  await request(app)
    .delete("/users/me")
    .set("Authorization", `Bearer ${userTest.tokens[0].token}`)
    .send()
    .expect(200);

  const user = await User.findById(userTestId);
  expect(user).toBeNull();
});

test("Should not delete account for unauthenticated user", async () => {
  await request(app).delete("/users/me").send().expect(401);
});

test("Should upload avatar image", async () => {
  await request(app)
    .post("/users/me/avatar")
    .set("Authorization", `Bearer ${userTest.tokens[0].token}`)
    .attach("avatar", "./tests/fixtures/profile.jpg")
    .expect(200);

  const user = await User.findById(userTestId);

  expect(user.avatar).toEqual(expect.any(Buffer));
});
