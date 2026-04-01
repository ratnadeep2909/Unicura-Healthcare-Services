document.addEventListener("DOMContentLoaded", function() {
  const findLabsButton = document.getElementById("findLabsButton");
  const nearestLabsResults = document.getElementById("nearestLabsResults");
  const selectedLabName = document.getElementById("selectedLabName");
  const selectedLabId = document.getElementById("selectedLabId");
  const labBookingForm = document.getElementById("labBookingForm");
  const trackLabBookingForm = document.getElementById("trackLabBookingForm");
  const trackLabBookingMobile = document.getElementById("trackLabBookingMobile");
  const labBookingTracker = document.getElementById("labBookingTracker");

  if (!findLabsButton || !nearestLabsResults) {
    return;
  }

  findLabsButton.addEventListener("click", function() {
    if (!navigator.geolocation) {
      nearestLabsResults.innerHTML = '<div class="nearest-lab-item">Location access is not supported in this browser.</div>';
      return;
    }

    nearestLabsResults.innerHTML = '<div class="nearest-lab-item">Detecting your location and loading nearby test labs...</div>';

    navigator.geolocation.getCurrentPosition(async function(position) {
      try {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const response = await fetch(`/api/test-labs?lat=${latitude}&lng=${longitude}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to fetch nearby test labs.");
        }

        if (!data.testLabs || !data.testLabs.length) {
          nearestLabsResults.innerHTML = '<div class="nearest-lab-item">No nearby test labs were found.</div>';
          return;
        }

        nearestLabsResults.innerHTML = data.testLabs.map(function(lab) {
          return `
            <article class="nearest-lab-item">
              <div style="display: inline-flex; background: rgba(63,188,192,0.18); color: #9ff6ff; border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 700; margin-bottom: 12px;">
                ${lab.homeCollection ? "Home collection available" : "Visit lab"}
              </div>
              <h3 style="margin-top: 0;">${lab.name}</h3>
              <p><strong>Address:</strong> ${lab.address}</p>
              <p><strong>City:</strong> ${lab.city}</p>
              <p><strong>Phone:</strong> ${lab.phone}</p>
              <p><strong>Hours:</strong> ${lab.openHours}</p>
              <p><strong>Distance:</strong> ${lab.distanceKm != null ? `${lab.distanceKm} km` : "Not available"}</p>
              <p><strong>Popular Tests:</strong> ${(lab.testsAvailable || []).join(", ")}</p>
              <button class="select-lab-btn" type="button" data-id="${lab.id}" data-name="${lab.name}" style="background: #3fbcc0; color: #052530; border: none; border-radius: 999px; padding: 10px 16px; font-weight: 700; cursor: pointer;">Select This Lab</button>
            </article>
          `;
        }).join("");

        document.querySelectorAll(".select-lab-btn").forEach(function(button) {
          button.addEventListener("click", function() {
            if (selectedLabName) {
              selectedLabName.textContent = button.dataset.name;
            }
            if (selectedLabId) {
              selectedLabId.value = button.dataset.id;
            }
          });
        });
      } catch (error) {
        nearestLabsResults.innerHTML = `<div class="nearest-lab-item">${error.message}</div>`;
      }
    }, function() {
      nearestLabsResults.innerHTML = '<div class="nearest-lab-item">Location permission was denied. Please allow access and try again.</div>';
    });
  });

  if (labBookingForm) {
    labBookingForm.addEventListener("submit", async function(event) {
      event.preventDefault();

      const payload = {
        fullName: document.getElementById("labBookingName").value.trim(),
        mobileNumber: document.getElementById("labBookingMobile").value.trim(),
        email: document.getElementById("labBookingEmail").value.trim(),
        address: document.getElementById("labBookingAddress").value.trim(),
        city: document.getElementById("labBookingCity").value.trim(),
        labId: selectedLabId ? selectedLabId.value : "",
        labName: selectedLabName ? selectedLabName.textContent.trim() : "",
        preferredDate: document.getElementById("labBookingDate").value,
        testType: document.getElementById("labBookingTestType").value,
        notes: document.getElementById("labBookingNotes").value.trim(),
        homeCollection: document.getElementById("labBookingHomeCollection").checked
      };

      try {
        const response = await fetch("/api/test-lab-bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to book the lab test.");
        }

        alert(data.message || "Lab test booked successfully.");
        labBookingForm.reset();
        if (trackLabBookingMobile) {
          trackLabBookingMobile.value = payload.mobileNumber;
          loadLabBookings(payload.mobileNumber);
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (trackLabBookingForm) {
    trackLabBookingForm.addEventListener("submit", async function(event) {
      event.preventDefault();
      await loadLabBookings(trackLabBookingMobile ? trackLabBookingMobile.value.trim() : "");
    });
  }

  async function loadLabBookings(mobileNumber) {
    if (!labBookingTracker) {
      return;
    }

    if (!mobileNumber) {
      labBookingTracker.innerHTML = '<div class="lab-tracker-item">Enter a mobile number to track lab bookings.</div>';
      return;
    }

    labBookingTracker.innerHTML = '<div class="lab-tracker-item">Loading your recent lab bookings...</div>';

    try {
      const response = await fetch(`/api/test-lab-bookings?mobileNumber=${encodeURIComponent(mobileNumber)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load lab bookings.");
      }

      if (!data.bookings || !data.bookings.length) {
        labBookingTracker.innerHTML = '<div class="lab-tracker-item">No lab bookings found for this mobile number yet.</div>';
        return;
      }

      labBookingTracker.innerHTML = data.bookings.map(function(booking) {
        return `
          <article class="lab-tracker-item">
            <p><strong>Lab:</strong> ${booking.labName}</p>
            <p><strong>Test:</strong> ${booking.testType}</p>
            <p><strong>Date:</strong> ${booking.preferredDate}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
            <p><strong>Collection:</strong> ${booking.homeCollection ? "Home collection" : "Visit lab"}</p>
            <p><strong>Address:</strong> ${booking.address}${booking.city ? `, ${booking.city}` : ""}</p>
            <p><strong>Notes:</strong> ${booking.notes || "No extra notes added."}</p>
          </article>
        `;
      }).join("");
    } catch (error) {
      labBookingTracker.innerHTML = `<div class="lab-tracker-item">${error.message}</div>`;
    }
  }
});
