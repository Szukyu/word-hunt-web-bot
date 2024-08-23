document.addEventListener('DOMContentLoaded', function() {
  fetch('words.txt')
  .then(function(response) {
      return response.text();
    })
  .then(function(words){
      console.log(words);
      document.getElementById('file').textContent = words;
    })
})
