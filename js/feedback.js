const FEEDBACK_STORAGE_KEY = 'vestige-feedback-reviews';

function readReviews() {
  const savedReviews = localStorage.getItem(FEEDBACK_STORAGE_KEY);
  if (savedReviews === null) return [];

  const reviews = JSON.parse(savedReviews);
  if (!Array.isArray(reviews)) {
    throw new Error('Saved feedback has an invalid format.');
  }

  return reviews;
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
  container.append(heading);

  reviews.slice().reverse().forEach((review) => {
    const article = document.createElement('article');
    article.className = 'feedback-review';

    const reviewHeading = document.createElement('div');
    reviewHeading.className = 'feedback-review-heading';

    const name = document.createElement('strong');
    name.textContent = review.name;

    const stars = document.createElement('span');
    stars.className = 'feedback-review-stars';
    stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
    stars.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;

    const text = document.createElement('p');
    text.textContent = review.review;

    reviewHeading.append(name, stars);
    article.append(reviewHeading, text);
    container.append(article);
  });
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

  try {
    renderReviews(reviewsContainer, readReviews());
  } catch (error) {
    console.error('Unable to load feedback:', error);
    status.textContent = 'Saved reviews could not be loaded. Please refresh or try again later.';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const review = String(formData.get('review') || '').trim();
    const rating = Number(formData.get('rating'));

    if (!name || !review || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      status.textContent = 'Please enter your name, choose a star rating, and write a brief review.';
      return;
    }

    try {
      const reviews = readReviews();
      reviews.push({ name, rating, review });
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(reviews));
      renderReviews(reviewsContainer, reviews);
      form.reset();
      if (defaultName && nameInput instanceof HTMLInputElement) {
        nameInput.value = defaultName;
      }
      delete starsContainer.dataset.rating;
      status.textContent = 'Thank you! Your feedback has been saved.';
    } catch (error) {
      console.error('Unable to save feedback:', error);
      status.textContent = 'Your feedback could not be saved. Please try again.';
    }
  });
}
