fetch("http://localhost:3000/dashboard/pipeline")
  .then(res => res.text())
  .then(text => console.log(text))
  .catch(console.error);
