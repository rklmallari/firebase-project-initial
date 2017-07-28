
'use strict';

function eBookShare() {
  this.checkSetup();

  this.userName = document.getElementById('user-name');
  this.myCollTab = document.getElementById('my-collection');
  this.signInButton = document.getElementById('sign-in');
  this.signOutButton = document.getElementById('sign-out');
  this.userPic = document.getElementById('user-pic');
  this.uploadForm =document.getElementById('uploadForm');
  this.uploader = document.getElementById('uploader');
  this.bookTitle = document.getElementById('bookTitle');
  this.optGenre = document.getElementById('optGenre');
  this.myProfile = document.getElementById('section3');
  this.myCollection = document.getElementById('section2');
  this.userNameField = document.getElementById('userNameField');
  this.screenNameField = document.getElementById('screenNameField');
  this.selfIntro = document.getElementById('selfIntro');
  this.uploadBox = document.getElementById('uploadBox');
  this.description = document.getElementById('description');
  this.updProfButton = document.getElementById('updProfButton');
  this.searchButton = document.getElementById('searchButton');
  this.searchText = document.getElementById('searchText');

  this.searchButton.addEventListener('click', this.searchBook.bind(this));

  this.signOutButton.addEventListener('click', this.signOut.bind(this));
  this.signInButton.addEventListener('click', this.signIn.bind(this));

  this.updProfButton.addEventListener('click', e => {
    this.updateUser(this.auth.currentUser);
  });

  this.uploadBox.addEventListener('change', this.upload.bind(this));

  this.initFirebase();
}

eBookShare.prototype.initFirebase = function () {
  this.auth = firebase.auth();
  this.database = firebase.database();
  this.storage = firebase.storage();
  this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
}

eBookShare.prototype.signOut = function () {
  this.auth.signOut();
  window.uploadForm.reset();
  console.info("User logged out.");
}

eBookShare.prototype.signIn = function () {
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({
    'prompt': 'select_account'
  });
  const promise = this.auth.signInWithPopup(provider);
  console.info("User logged in.");
  promise.catch(e => console.log(e.message));
}

eBookShare.prototype.upload = function (e) {
  e.preventDefault();

  if(screenNameField.value == "" || screenNameField.value == null) {
      alert("Please update your profile first. Screen Name is required before uploading any eBook.");
      window.uploadForm.reset();
    } else if(bookTitle.value == "" || bookTitle.value == null || 
      description.value== "" || description.value == null || 
      optGenre.value == "" || optGenre.value == null) {
      alert("Ensure to populate below fields before uploading: \nTitle, Description, Genre");
      window.uploadForm.reset();
    } else {
      var file = e.target.files[0];
      var metadata = {
          'contentType': file.type
      };
      var storageRef = this.storage.ref('ebooks/' + firebase.auth().currentUser.uid + "/" + firebase.auth().currentUser.uid + '_' + bookTitle.value);

      var task = storageRef.put(file, metadata);

      task.on('state_changed', 

        function(snapshot) {
          var percentage = (snapshot.bytesTransferred / snapshot.totalBytes) *100;
          uploader.value = percentage;
          console.log('Uploaded', snapshot.totalBytes, 'bytes.');
        },
        function(error) {
          console.error('Upload failed:', error);
          alert('Upload failed! Ensure that you are uploading a file with acceptable format.')
        },
        function() {
            this.downloadUrl = task.snapshot.downloadURL;

            var inputData = {
                description: description.value,
                downloads : 0,
                downloadUrl: this.downloadUrl,
                genre: optGenre.value,
                title: bookTitle.value,
                authorId: firebase.auth().currentUser.uid,
                authorPic: firebase.auth().currentUser.photoURL
            };

            $.post("https://ebooksharingwebapp.firebaseio.com/books.json",
              JSON.stringify(inputData),
              function(data, status){
                if (status === "success") {
                  var bookAuthorMapRef = firebase.database().ref('bookAuthorMap/' + firebase.auth().currentUser.uid + '/booksAuthored/' + data.name).set({
                    downloads : 0,
                    downloadUrl : task.snapshot.downloadURL,
                    title : bookTitle.value,
                    genre: optGenre.value,
                    description: description.value
                  });

                  alert("Upload complete!");

                  if (bookAuthorMapRef) {
                    window.uploadForm.reset();
                    window.bookForm.reset();
                    uploader.value = 0;
                  }
                }
              }
            );
        }
      );

    }
}

eBookShare.prototype.onAuthStateChanged = function(user) {
  if (user) { 
    var userName = user.displayName;

    this.userName.textContent = userName;
    this.myCollTab.textContent = ">My Collection";
    this.checkUserExist(user);

    this.userName.removeAttribute('hidden');
    this.myCollTab.removeAttribute('hidden');
    this.signOutButton.removeAttribute('hidden');
    this.myProfile.removeAttribute('hidden');
    this.myCollection.removeAttribute('hidden');
    this.uploadBox.disabled = false;
    this.bookTitle.disabled = false;
    this.description.disabled = false;
    this.optGenre.disabled = false;
    this.searchButton.disabled = false;
    this.searchText.disabled = false;
    this.userNameField.setAttribute('value', userName);
    this.userPic.setAttribute('src', user.photoURL)

    this.retrieveUser(user);
    this.retrieveUserCollection(user);
    this.signInButton.setAttribute('hidden', 'true');

  } else {
    this.userName.setAttribute('hidden', 'true');
    this.myCollTab.setAttribute('hidden', 'true');
    this.signOutButton.setAttribute('hidden', 'true');
    this.myProfile.setAttribute('hidden', 'true');
    this.myCollection.setAttribute('hidden', 'true');
    this.uploadBox.disabled = true;
    this.bookTitle.disabled = true;
    this.description.disabled = true;
    this.optGenre.disabled = true;
    this.searchButton.disabled = true;
    this.searchText.disabled = true;

    this.signInButton.removeAttribute('hidden');
  }
};

eBookShare.prototype.checkUserExist = function (user) {
  var userRef = this.database.ref('authors/' + user.uid);
  userRef.once('value', function(snapshot) {
    if (snapshot.val() == null) {
      userRef.set({
        profilePic : user.photoURL,
        userName : user.displayName,
        selfIntro : "<insert brief bio here>",
        screenName : $.trim(user.displayName.toLowerCase())
      });
      console.log("User inserted on DB.");
    } else {
      userRef.update({
        profilePic : user.photoURL,
        userName : user.displayName
      });
      console.log("User updated on DB.");
    }
  });
}

eBookShare.prototype.updateUser = function(user) {
  if(screenNameField.value == "" || screenNameField.value == null) {
      alert("Screen Name is required.");
    } else {
      var updProfPost = {
        screenName : screenNameField.value,
        selfIntro : selfIntro.value
      };
      var userRef = this.database.ref('authors/' + user.uid);
      userRef.update(updProfPost);
      console.log("User updated on DB.");
      alert("Profile updated!");
    }
}

eBookShare.prototype.retrieveUser = function(user) {
  var userRef = this.database.ref('authors/' + user.uid).on('value', function(snapshot) {
    screenNameField.setAttribute("value", snapshot.child("screenName").val());
    selfIntro.value = snapshot.child("selfIntro").val();
  });
}

eBookShare.prototype.retrieveUserCollection = function(user) {
  var bookRef = this.database.ref('bookAuthorMap/' + user.uid + '/booksAuthored').on('value', function(snapshot) {
    var objects = snapshot.val();
    $('#bookList').empty();
    for(var key in objects){
      $('#bookList').append($('<li/>',{
      html: '<a style="color:white; font-weight:900" href="' + objects[key].downloadUrl + '" title="View '+ objects[key].title + '">' + objects[key].title + ' </a> <button onClick="deleteBook(\'' + key + '\', \'' + objects[key].title + '\');" class="fa fa-remove" title="Remove" style="color:red; border:none; background-color:transparent" /><br>Description: ' + objects[key].description + '<br>Genre: ' + objects[key].genre + '<br>Total downloads: ' + objects[key].downloads + "<br><br>"
      }));
    }
  });
}

eBookShare.prototype.checkSetup = function() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
};

eBookShare.prototype.searchBook = function (e) {
  e.preventDefault();
  var bookRef = this.database.ref().child('books').orderByChild('title').equalTo(searchText.value).on('value', function(snapshot) {
    var objects = snapshot.val();
    $('#searchList').empty();
    if (objects === null) {
      $('#searchList').append($('<li/>',{
          html: '<p style="font-weight:700">No result.</P'
        }));
    } else {
      for(var key in objects){
        $('#searchList').append($('<li/>',{
          html: '<a style="color:black; font-weight:900" href="' + objects[key].downloadUrl + '" title="Download '+ objects[key].title + '" target="_blank" onClick="return plusDownload(\'' + key + '\', \'' + objects[key].authorId + '\');">' + objects[key].title + ' <i class="fa fa-download"></i></a><br>Author: <img style="width:20px; height:auto" src="' + objects[key].authorPic + '" /><br>Description: ' + objects[key].description + '<br>Genre: ' + objects[key].genre + '<br>Total downloads: ' + objects[key].downloads + "<br><br>"
        }));
      }
    }
  });
}

function deleteBook(bookId, bookTitle) {

  var confirmDelete = confirm("Are you sure you want to delete this book?");

  if (confirmDelete) {
    var bookRef = firebase.database().ref();
    var currentUserUid = firebase.auth().currentUser.uid;

    var deletes = {};

    deletes['/books/' + bookId] = null;
    deletes['/bookAuthorMap/' + currentUserUid + '/booksAuthored/' + bookId] = null;

    var deleteBook = bookRef.update(deletes);
    console.log("Book deleted from account!");

    var bookStorageRef = firebase.storage().ref('ebooks/' + currentUserUid);
    bookStorageRef.child(currentUserUid + '_' + bookTitle).delete()
      .then(e => {
        alert("Book has been removed from cloud storage.");
      })
      .catch(e => {
        alert("Failed to delete ebook from cloud storage.");
        console.log(e.message);
      });
  }
}

function plusDownload(bookId, authorId) {
  var rootRef = firebase.database().ref();
  var downloadCount;

  var bookRef = firebase.database().ref('/books/' + bookId + '/downloads').on('value', function(snapshot) {
    downloadCount = snapshot.val();
    console.log("Download count: " + downloadCount);
  });

  var updates = {};

  updates['/books/' + bookId + '/downloads'] = downloadCount+1;
  updates['/bookAuthorMap/' + authorId + '/booksAuthored/' + bookId + '/downloads'] = downloadCount+1;

  var deleteBook = rootRef.update(updates);
  console.log("Download count updated!");

  return true;
}

$('#searchText').keypress(function(e){
  if(e.keyCode == 13){
    $('#searchButton').click();
  }
});

window.onload = function() {
  window.eBookShare = new eBookShare();
};

$(document).ready(function(){/* activate scrollspy menu */
$('body').scrollspy({
  target: '#navbar-collapsible',
  offset: 50
});

$('form').keypress(function(event) { 
  return event.keyCode != 13;
});

/* smooth scrolling sections */
$('a[href*=#]:not([href=#])').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top - 50
        }, 1000);
        return false;
      }
    }
});

});
