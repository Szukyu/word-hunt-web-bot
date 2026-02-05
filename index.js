document.addEventListener('DOMContentLoaded', function() {
  let fr = new FileReader();
  fr.onload = function() {
    document.getElementById('file').textContent = fr.result;
  }
  fr.readAsText(this.files[0])
})
