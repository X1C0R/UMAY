
import fetch from "node-fetch";

// const token = "ayokonapo";
async function testActivity() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA2ZGYxNDc4LWZkZDYtNGNkYS05MWVmLWFkZTk4MmZkZDMwNyIsImVtYWlsIjoibWFya2xlbWluNjA2QGdtYWlsLmNvbSIsImlhdCI6MTc2MzA1MjA4NSwiZXhwIjoxNzYzMTM4NDg1fQ.GWP3osy-ZoK9JPwS6x8O5Q7p4z9dyUFD29qpuBcnng0";

  // const res = await fetch("http://192.168.100.5:4000/activity", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": `Bearer ${token}`
  //   },
  //   body: JSON.stringify({
  //     subject: "ayoko",
  //     reading_time: 25,
  //     playback_time: 10,
  //     quiz_score: 90,
  //     focus_level: 4,
  //     activity_type: "Study Session",
  //     device_used: "Laptop",
  //     session_date: "2025-11-13T08:30:00Z"
  //   })
  // });



  const res = await fetch("http://192.168.100.5:4000/visual-learning", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      quiz_score: 80,
      // Learning_Type: "Audio Visual",
      // session_date: "2025-11-13T08:30:00Z"
    })
  });
  const data = await res.json();
  console.log(data);
}





testActivity();

