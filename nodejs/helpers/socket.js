io.on("connection", async (socket) => {
  console.log("User connected using socket id: ", socket.id);
  socket.join("online");
  socket.on("disconnect", async () => {
    console.log("User disconnected: ", socket.id);
    socket.leave("online");
  });
  socket.on("error", (err) => {
    console.log("socket error", err);
  });
});
