document.addEventListener('DOMContentLoaded', function() {
  fetch('words.txt')
    .then(response => {
      return response.text();
    })
    .then(text => {
      document.getElementByID('file').textContent = text;
    })
    .catch(error => {
      console.log("Fetch Error")
    })
})
