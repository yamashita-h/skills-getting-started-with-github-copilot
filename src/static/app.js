document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // 追加: 簡易 HTML エスケープ（参加者名に対する XSS 防止）
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select options to avoid duplicates when reloading
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // 変更: 参加者リストを含めたカード内容（エスケープを適用）
        const participantsHtml = details.participants.length
          ? `<ul class="participants-list">${details.participants
              .map(
                (p) =>
                  `<li class="participant-item"><span>${escapeHtml(
                    p
                  )}</span><button class="remove-btn" data-activity="${escapeHtml(
                    name
                  )}" data-email="${escapeHtml(p)}" aria-label="Remove participant">×</button></li>`
              )
              .join("")}</ul>`
          : `<div class="participants-list"><em>No participants yet</em></div>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

    // Event delegation: handle click on remove buttons for participants
    activitiesList.addEventListener("click", async (event) => {
      const btn = event.target.closest(".remove-btn");
      if (!btn) return;

      const activity = btn.dataset.activity;
      const email = btn.dataset.email;

      if (!activity || !email) return;

      // Optional: confirm the action
      if (!confirm(`Unregister ${email} from ${activity}?`)) return;

      try {
        const resp = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
          {
            method: "POST",
          }
        );

        const result = await resp.json();

        if (resp.ok) {
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
          messageDiv.classList.remove("hidden");
          // Refresh list
          fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "Failed to unregister";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
        }

        // Hide after a few seconds
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 4000);
      } catch (err) {
        console.error("Failed to unregister:", err);
        messageDiv.textContent = "Failed to unregister. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
            signupForm.reset();
            // Refresh activities so the new participant appears immediately
            fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
