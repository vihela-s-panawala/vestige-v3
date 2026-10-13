const FEEDBACK_ENDPOINT = '/api/feedback';

function createReview(review) {
  const article = document.createElement('article');
  article.className = 'feedback-review';

  const heading = document.createElement('div');
  heading.className = 'feedback-review-heading';

  const name = document.createElement('strong');
  name.textContent = review.name;

  const stars = document.createElement('span');
  stars.className = 'feedback-review-stars';
  stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
  stars.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;

  const text = document.createElement('p');
  text.textContent = review.review;

  heading.append(name, stars);
  article.append(heading, text);
  return article;
}

function renderReviews(container, reviews) {
  container.replaceChildren();

  if (reviews.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'feedback-intro';
    emptyMessage.textContent = 'No reviews yet. Be the first to share feedback.';
    container.append(emptyMessage);
    return;
  }

  const heading = document.createElement('h3');
  heading.textContent = 'Recent reviews';
  container.append(heading, ...reviews.map(createReview));
}

export function bindFeedbackForm(defaultName = '') {
  const form = document.querySelector('[data-feedback-form]');
  const status = document.querySelector('[data-feedback-status]');
  const reviewsContainer = document.querySelector('[data-feedback-reviews]');

  if (!form || !status || !reviewsContainer) return;

  const nameInput = form.elements.namedItem('name');
  const starsContainer = form.querySelector('.feedback-stars');
  const ratingInputs = form.querySelectorAll('input[name="rating"]');
  if (defaultName && nameInput instanceof HTMLInputElement) {
    nameInput.value = defaultName;
  }

  ratingInputs.forEach((input) => {
    input.addEventListener('change', () => {
      starsContainer.dataset.rating = input.value;
    });
  });

  async function loadReviews() {
    const response = await fetch(FEEDBACK_ENDPOINT);
    if (!response.ok) {
      throw new Error(`Feedback request failed with status ${response.status}.`);
    }

    const reviews = await response.json();
    if (!Array.isArray(reviews)) {
      throw new Error('The feedback service returned invalid data.');
    }
    renderReviews(reviewsContainer, reviews);
  }

  loadReviews().catch((error) => {
    console.error('Unable to load feedback:', error);
    status.textContent = 'Reviews could not be loaded. Please try again later.';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const review = String(formData.get('review') || '').trim();
    const rating = Number(formData.get('rating'));

    if (!name || !review || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      status.textContent = 'Please enter your name, choose a star rating, and write a brief review.';
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    status.textContent = 'Submitting your feedback...';

    try {
      const response = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, review })
      });
      const savedReview = await response.json();

      if (!response.ok) {
        throw new Error(savedReview.message || `Feedback request failed with status ${response.status}.`);
      }

      form.reset();
      if (defaultName && nameInput instanceof HTMLInputElement) {
        nameInput.value = defaultName;
      }
      delete starsContainer.dataset.rating;
      try {
        await loadReviews();
        status.textContent = 'Thank you! Your feedback has been shared.';
      } catch (error) {
        console.error('Feedback was saved, but the review list could not be refreshed:', error);
        reviewsContainer.prepend(createReview(savedReview));
        status.textContent = 'Your feedback was saved, but the review list could not be refreshed.';
      }
    } catch (error) {
      console.error('Unable to submit feedback:', error);
      status.textContent = 'Your feedback could not be submitted. Please try again later.';
    } finally {
      submitButton.disabled = false;
    }
  });
}
