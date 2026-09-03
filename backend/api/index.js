import app from "../src/server.js";
import connectDB from "../src/config/db.js";

let dbReadyPromise = null;

const handler = async (req, res) => {
  dbReadyPromise ||= connectDB();
  await dbReadyPromise;

  return app(req, res);
};

export default handler;
