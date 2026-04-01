(function() {
  "use strict";

  document.addEventListener(
    "submit",
    async function(event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      if (form.matches("#contactForm")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        await submitContactForm(form);
        return;
      }

      if (form.matches("#feedback-form")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        await submitFeedbackForm(form);
        return;
      }

      if (form.matches(".subscribe-form")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        await submitSubscriptionForm(form);
        return;
      }

      if (form.matches("#bloodTestForm")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        await submitBloodTestForm(form);
        return;
      }

      if (form.matches("#appointmentForm")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        await submitSimpleAppointmentForm(form);
      }
    },
    true
  );

  document.addEventListener(
    "click",
    async function(event) {
      const button = event.target.closest("#emergencyButton");
      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      await submitEmergencyRequest(button);
    },
    true
  );

  async function submitContactForm(form) {
    const payload = {
      name: getFieldValue(form, "#name", "[name='name']"),
      email: getFieldValue(form, "#email", "[name='email']"),
      subject: getFieldValue(form, "#subject", "[name='subject']"),
      message: getFieldValue(form, "textarea[name='message']")
    };

    try {
      const data = await postJson("/api/contact", payload);
      const confirmationMessage = document.getElementById("confirmationMessage");
      if (confirmationMessage) {
        confirmationMessage.style.display = "block";
      }
      alert(data.message || "Message sent successfully.");
      form.reset();

      if (confirmationMessage) {
        setTimeout(() => {
          confirmationMessage.style.display = "none";
        }, 5000);
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function submitFeedbackForm(form) {
    const ratingValue = window.rating || getCheckedRatingValue();
    const nameInput = form.querySelector("#name, input[type='text']");
    const emailInput = form.querySelector("#email, input[type='email']");
    const feedbackInput = form.querySelector("#feedback, textarea");

    const payload = {
      name: nameInput ? nameInput.value.trim() : "",
      email: emailInput ? emailInput.value.trim() : "",
      rating: ratingValue || 0,
      feedback: feedbackInput ? feedbackInput.value.trim() : ""
    };

    try {
      const data = await postJson("/api/feedback", payload);
      form.reset();
      if (typeof window.updateStars === "function") {
        window.rating = null;
        window.updateStars();
      }

      const popup = document.getElementById("popup");
      if (popup) {
        popup.style.display = "flex";
      }
      alert(data.message || "Thanks for the feedback!");
    } catch (error) {
      alert(error.message);
    }
  }

  async function submitSubscriptionForm(form) {
    const emailInput = form.querySelector("input[type='email'], input[type='text']");
    const email = emailInput ? emailInput.value.trim() : "";

    try {
      const data = await postJson("/api/subscriptions", {
        email,
        sourcePage: window.location.pathname
      });

      if (emailInput) {
        emailInput.value = "";
      }

      const confirmationMessage = findNearbyElement(form, ".confirmation-message");
      if (confirmationMessage) {
        confirmationMessage.style.display = "block";
        setTimeout(() => {
          confirmationMessage.style.display = "none";
        }, 5000);
      }

      const banner = document.getElementById("subscribeBanner");
      if (banner) {
        banner.style.display = "block";
        setTimeout(() => {
          banner.style.display = "none";
        }, 5000);
      }

      const modal = document.getElementById("popupModal");
      if (modal) {
        modal.style.display = "block";
        const closeButton = modal.querySelector(".close");
        if (closeButton) {
          closeButton.onclick = function() {
            modal.style.display = "none";
          };
        }
      }

      alert(data.message || "Thanks for subscribing!");
    } catch (error) {
      alert(error.message);
    }
  }

  async function submitEmergencyRequest(button) {
    const nameInput = document.getElementById("nameInput");
    const phoneInput = document.getElementById("phoneInput");

    try {
      const data = await postJson("/api/emergency-requests", {
        name: nameInput ? nameInput.value.trim() : "",
        phone: phoneInput ? phoneInput.value.trim() : "",
        sourcePage: window.location.pathname
      });

      const popup = document.getElementById("popup");
      if (popup) {
        popup.style.display = "block";
        setTimeout(() => {
          popup.style.display = "none";
        }, 3000);
      }

      alert(data.message || "Emergency request sent successfully.");
      if (nameInput) {
        nameInput.value = "";
      }
      if (phoneInput) {
        phoneInput.value = "";
      }
    } catch (error) {
      alert(error.message);
    }
  }

  async function submitBloodTestForm(form) {
    const payload = {
      bloodGroup: getFieldValue(form, "#bloodGroup"),
      wbc: Number(getFieldValue(form, "#wbcPercentage")),
      rbc: Number(getFieldValue(form, "#rbcPercentage")),
      platelets: Number(getFieldValue(form, "#plateletPercentage"))
    };

    try {
      const data = await postJson("/api/blood-test-analysis", payload);
      setText("resultText", data.resultText);
      setText("skinDiseaseChance", data.skinDiseaseChance);
      setText("cure", data.cure);

      const popupOverlay = document.getElementById("popupOverlay");
      if (popupOverlay) {
        popupOverlay.classList.remove("hidden");
      }
      document.body.classList.add("popup-open");
    } catch (error) {
      alert(error.message);
    }
  }

  async function submitSimpleAppointmentForm(form) {
    const age = getFieldValue(form, "#age", "[name='age']");
    const location = getFieldValue(form, "#location", "[name='location']");
    const note = getFieldValue(form, "#message", "[name='message']");
    const payload = {
      fullName: getFieldValue(form, "#name", "[name='name']"),
      dob: age,
      email: getFieldValue(form, "#email", "[name='email']"),
      phone: getFieldValue(form, "#phone", "[name='phone']"),
      doctor: "General Consultation",
      appointmentDate: getFieldValue(form, "#date", "[name='date']"),
      timeSlot: location || "Location not selected",
      reason: note ? `Location: ${location}. Note: ${note}` : `Location: ${location}`,
      existingPatient: false,
      patientId: ""
    };

    try {
      const data = await postJson("/api/appointments", payload);
      alert(data.message || "Appointment booked successfully.");
      form.reset();
    } catch (error) {
      alert(error.message);
    }
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  function getFieldValue(root, ...selectors) {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (element) {
        return String(element.value || "").trim();
      }
    }
    return "";
  }

  function findNearbyElement(form, selector) {
    let sibling = form.nextElementSibling;
    while (sibling) {
      if (sibling.matches && sibling.matches(selector)) {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    return document.querySelector(selector);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function getCheckedRatingValue() {
    const checked = document.querySelector("input[name='rating']:checked");
    return checked ? Number(checked.value) : 0;
  }
})();
