document.addEventListener("DOMContentLoaded", () => {
  const medicineForm = document.getElementById("medicine-form");
  const locationButton = document.getElementById("detect-location-btn");
  const pharmaciesContainer = document.getElementById("nearby-pharmacies");
  const selectedPharmacyName = document.getElementById("selected-pharmacy-name");
  const selectedPharmacyId = document.getElementById("selected-pharmacy-id");
  const orderForm = document.getElementById("pharmacy-order-form");
  const prescriptionInput = document.getElementById("prescription-image");
  const previewImage = document.getElementById("prescription-preview");
  const orderSummaryBox = document.getElementById("order-summary-box");
  const trackOrderForm = document.getElementById("track-order-form");
  const trackMobileNumber = document.getElementById("track-mobile-number");
  const orderStatusBoard = document.getElementById("order-status-board");

  if (medicineForm) {
    medicineForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const medicineName = document.getElementById("medicine-name").value;
      fetchMedicineInformation(medicineName);
    });
  }

  if (locationButton) {
    locationButton.addEventListener("click", detectLocationAndLoadPharmacies);
  }

  if (prescriptionInput) {
    prescriptionInput.addEventListener("change", async () => {
      const file = prescriptionInput.files && prescriptionInput.files[0];
      if (!file || !previewImage) {
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      previewImage.src = dataUrl;
      previewImage.style.display = "block";
      previewImage.dataset.imageValue = dataUrl;
    });
  }

  if (orderForm) {
    orderForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const prescriptionImage = previewImage ? previewImage.dataset.imageValue || "" : "";
      const payload = {
        fullName: document.getElementById("customer-name").value.trim(),
        mobileNumber: document.getElementById("customer-mobile").value.trim(),
        address: document.getElementById("customer-address").value.trim(),
        city: document.getElementById("customer-city").value.trim(),
        pharmacyId: selectedPharmacyId ? selectedPharmacyId.value : "",
        pharmacyName: selectedPharmacyName ? selectedPharmacyName.textContent.trim() : "",
        notes: document.getElementById("order-notes").value.trim(),
        prescriptionImage
      };

      try {
        const response = await fetch("/api/pharmacy-orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to place your order.");
        }

        if (orderSummaryBox && data.order) {
          orderSummaryBox.innerHTML = `
            <h3>Order Confirmed</h3>
            <p><strong>Order ID:</strong> ${data.order.id}</p>
            <p><strong>Pharmacy:</strong> ${data.order.pharmacyName}</p>
            <p><strong>Status:</strong> ${data.order.status}</p>
            <p><strong>Estimated delivery:</strong> ${data.order.estimatedDelivery}</p>
          `;
          orderSummaryBox.style.display = "block";
        }

        if (trackMobileNumber) {
          trackMobileNumber.value = payload.mobileNumber;
          loadOrderStatuses(payload.mobileNumber);
        }

        alert(data.message || "Prescription order placed successfully.");
        orderForm.reset();
        if (previewImage) {
          previewImage.style.display = "none";
          previewImage.removeAttribute("src");
          previewImage.dataset.imageValue = "";
        }
        if (selectedPharmacyName) {
          selectedPharmacyName.textContent = "No pharmacy selected";
        }
        if (selectedPharmacyId) {
          selectedPharmacyId.value = "";
        }
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (trackOrderForm) {
    trackOrderForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await loadOrderStatuses(trackMobileNumber ? trackMobileNumber.value.trim() : "");
    });
  }

  async function detectLocationAndLoadPharmacies() {
    if (!navigator.geolocation) {
      pharmaciesContainer.innerHTML = "<p>Geolocation is not supported in this browser.</p>";
      return;
    }

    pharmaciesContainer.innerHTML = "<p>Detecting your location and loading nearby pharmacies...</p>";

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/pharmacies?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Unable to fetch nearby pharmacies.");
          }

          renderPharmacies(data.pharmacies);
        } catch (error) {
          pharmaciesContainer.innerHTML = `<p>${error.message}</p>`;
        }
      },
      () => {
        pharmaciesContainer.innerHTML = "<p>Location permission was denied. Please allow location access and try again.</p>";
      }
    );
  }

  function renderPharmacies(pharmacies) {
    if (!pharmaciesContainer) {
      return;
    }

    if (!pharmacies.length) {
      pharmaciesContainer.innerHTML = "<p>No nearby pharmacies found.</p>";
      return;
    }

    pharmaciesContainer.innerHTML = pharmacies
      .map(
        (pharmacy) => `
          <article class="pharmacy-card">
            <div class="pharmacy-meta">${pharmacy.deliveryAvailable ? "Delivery available" : "Pickup only"}</div>
            <h3>${pharmacy.name}</h3>
            <p><strong>Address:</strong> ${pharmacy.address}</p>
            <p><strong>City:</strong> ${pharmacy.city}</p>
            <p><strong>Phone:</strong> ${pharmacy.phone}</p>
            <p><strong>Email:</strong> ${pharmacy.email}</p>
            <p><strong>Hours:</strong> ${pharmacy.openHours}</p>
            <p><strong>Distance:</strong> ${pharmacy.distanceKm != null ? `${pharmacy.distanceKm} km` : "Location not available"}</p>
            <div class="pharmacy-actions">
              <button class="button select-pharmacy-btn" type="button" data-id="${pharmacy.id}" data-name="${pharmacy.name}">Select This Pharmacy</button>
            </div>
          </article>
        `
      )
      .join("");

    document.querySelectorAll(".select-pharmacy-btn").forEach((button) => {
      button.addEventListener("click", () => {
        if (selectedPharmacyName) {
          selectedPharmacyName.textContent = button.dataset.name;
        }
        if (selectedPharmacyId) {
          selectedPharmacyId.value = button.dataset.id;
        }
        if (orderSummaryBox) {
          orderSummaryBox.style.display = "none";
          orderSummaryBox.innerHTML = "";
        }
      });
    });
  }

  async function loadOrderStatuses(mobileNumber) {
    if (!orderStatusBoard) {
      return;
    }

    if (!mobileNumber) {
      orderStatusBoard.innerHTML = "<p class=\"helper-text\">Enter a mobile number to check order status.</p>";
      return;
    }

    orderStatusBoard.innerHTML = "<p class=\"helper-text\">Loading your recent prescription orders...</p>";

    try {
      const response = await fetch(`/api/pharmacy-orders?mobileNumber=${encodeURIComponent(mobileNumber)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load order status.");
      }

      if (!data.orders || !data.orders.length) {
        orderStatusBoard.innerHTML = "<p class=\"helper-text\">No prescription orders found for this mobile number yet.</p>";
        return;
      }

      orderStatusBoard.innerHTML = data.orders
        .map(
          (order) => `
            <article class="order-status-card">
              <div class="order-status-top">
                <div>
                  <strong>${order.pharmacyName}</strong>
                  <p>Order ID: ${order.id}</p>
                </div>
                <span class="status-pill">${order.status}</span>
              </div>
              <p><strong>Estimated delivery:</strong> ${order.estimatedDelivery}</p>
              <p><strong>Delivery address:</strong> ${order.address}${order.city ? `, ${order.city}` : ""}</p>
              <p><strong>Notes:</strong> ${order.notes || "No extra notes added."}</p>
              <p><strong>Placed on:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            </article>
          `
        )
        .join("");
    } catch (error) {
      orderStatusBoard.innerHTML = `<p class="helper-text">${error.message}</p>`;
    }
  }
});

async function fetchMedicineInformation(medicineName) {
  try {
    const response = await fetch(`/api/medicine-info?name=${encodeURIComponent(medicineName)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to fetch medicine information.");
    }
    displayMedicineInformation(data);
  } catch (error) {
    console.error("Error fetching medicine information:", error);
    document.getElementById("medicine-info").innerHTML = `<p>${error.message || "There was an error fetching the medicine information. Please try again later."}</p>`;
  }
}

function displayMedicineInformation(data) {
  const medicineInfoSection = document.getElementById("medicine-info");
  medicineInfoSection.innerHTML = "";

  if (data.brandName) {
    medicineInfoSection.innerHTML = `
      <h2>${data.brandName || "No brand name available"}</h2>
      <p><strong>Purpose:</strong> ${data.purpose && data.purpose.length ? data.purpose.join(", ") : "No purpose information available"}</p>
      <p><strong>Warnings:</strong> ${data.warnings && data.warnings.length ? data.warnings.join("<br>") : "No warnings available"}</p>
      <p><strong>Directions:</strong> ${data.directions && data.directions.length ? data.directions.join("<br>") : "No directions available"}</p>
    `;
  } else {
    medicineInfoSection.innerHTML = "<p>No information found for the specified medicine.</p>";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
