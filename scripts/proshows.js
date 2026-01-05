// Ensure GSAP and CustomEase plugins are loaded before running this script
gsap.registerPlugin(CustomEase);

// Define the custom "hop" easing
CustomEase.create(
  "hop",
  "M0,0 C0.083,0.294 0.117,0.767 0.413,0.908 0.606,1 0.752,1 1,1 "
);

// Select carousel elements
const carousel = document.getElementById("proshows");
const carouselInner = document.querySelector(".carousel-inner");

let isAnimating = false; // Prevent overlapping animations

// Smooth scrolling with GSAP, hop animation, and fade effects
const scrollCarousel = (direction) => {
  if (isAnimating) return; // Prevent overlapping animations
  isAnimating = true;

  // Update carousel items dynamically
  const carouselItems = carouselInner.querySelectorAll(".carousel-item");

  // Calculate the width of one slide
  const slideWidth = carouselItems[0].offsetWidth;

  // Determine the active item and its neighbors for fade effect
  const activeIndex = Math.round(carousel.scrollLeft / slideWidth);
  let nextIndex = direction === "right" ? activeIndex + 1 : activeIndex - 1;

  // Handle infinite loop
  if (nextIndex >= carouselItems.length) {
    nextIndex = 0;
    // Move the first item to the end
    carouselInner.appendChild(carouselItems[0]);
    carousel.scrollLeft -= slideWidth; // Adjust scroll position
  } else if (nextIndex < 0) {
    nextIndex = carouselItems.length - 1;
    // Move the last item to the beginning
    carouselInner.prepend(carouselItems[carouselItems.length - 1]);
    carousel.scrollLeft += slideWidth; // Adjust scroll position
  }

  const nextItem = carouselItems[nextIndex];
  const activeItem = carouselItems[activeIndex];

  // Create GSAP animation timeline
  const timeline = gsap.timeline();

  timeline
    .addLabel("start")
    // Fade out the currently active item
    .to(
      activeItem,
      {
        opacity: 0,
        duration: 0.6,
        ease: "power1.out",
      },
      "start"
    )
    // Smooth scrolling transition
    .to(
      carousel,
      {
        scrollLeft:
          carousel.scrollLeft +
          (direction === "right" ? slideWidth : -slideWidth),
        duration: 1.2,
        ease: "hop",
      },
      "start"
    )
    // Fade in the next item
    .to(
      nextItem,
      {
        opacity: 1,
        duration: 0.55,
        ease: "power1.out",
      },
      "-=0.7"
    ) // Overlap fade-in with scrolling
    // Reset the animation guard
    .to(
      {},
      {
        onComplete: () => (isAnimating = false), // Enable new animations
      }
    );
};

// Event listener for mouse wheel
carousel.addEventListener("wheel", (event) => {
  event.preventDefault();
  scrollCarousel(event.deltaY > 0 ? "right" : "left");
});

// Event listener for keyboard navigation
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    scrollCarousel("right");
  } else if (event.key === "ArrowLeft") {
    scrollCarousel("left");
  }
});

// Touch/swipe functionality for mobile devices
let startX = 0;
let isTouching = false;

carousel.addEventListener("touchstart", (event) => {
  startX = event.touches[0].clientX;
  isTouching = true;
});

carousel.addEventListener("touchmove", (event) => {
  if (!isTouching) return;
  const touchEndX = event.touches[0].clientX;

  // Calculate the distance moved
  const distance = touchEndX - startX;

  // Swipe threshold to trigger scroll (you can adjust this value if needed)
  const swipeThreshold = 50;

  // Detect left or right swipe
  if (Math.abs(distance) > swipeThreshold) {
    if (distance < 0) {
      scrollCarousel("right");
    } else {
      scrollCarousel("left");
    }

    // Stop further touchmove until the swipe completes
    isTouching = false;
  }
});

carousel.addEventListener("touchend", () => {
  isTouching = false;
});

// Initialize the carousel with opacity set for proper transitions
document.querySelectorAll(".carousel-item").forEach((item, index) => {
  gsap.set(item, { opacity: index === 0 ? 1 : 0 }); // Only the first item is fully visible initially
});
