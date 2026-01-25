exports.handler = async function (event) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "CoreHabit backend is working 🚀"
    })
  };
};
