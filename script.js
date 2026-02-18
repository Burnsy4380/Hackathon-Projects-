document.getElementById("profileForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const bio = document.getElementById("bio").value;
  const avatarInput = document.getElementById("avatar");

  const reader = new FileReader();

  reader.onload = function() {
    const avatarData = reader.result;

    // Save to localStorage
    localStorage.setItem("profile", JSON.stringify({
      username,
      bio,
      avatar: avatarData
    }));

    displayProfile();
  };

  if (avatarInput.files[0]) {
    reader.readAsDataURL(avatarInput.files[0]);
  } else {
    localStorage.setItem("profile", JSON.stringify({
      username,
      bio,
      avatar: ""
    }));
    displayProfile();
  }
});

function displayProfile() {
  const profile = JSON.parse(localStorage.getItem("profile"));
  if (!profile) return;

  document.getElementById("profileDisplay").style.display = "block";
  document.getElementById("displayUsername").textContent = profile.username;
  document.getElementById("displayBio").textContent = profile.bio;
  document.getElementById("displayAvatar").src = profile.avatar;
}

window.onload = displayProfile;
