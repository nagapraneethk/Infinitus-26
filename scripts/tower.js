const video = document.querySelector(".tower-animation");
const container = document.querySelector("#container");
const towerBtn = document.querySelector("#tower-btn");

let src = video.currentSrc || video.src;
console.log(video, src);

/* Make sure the video is 'activated' on iOS */
function once(el, event, fn, opts) {
  var onceFn = function (e) {
    el.removeEventListener(event, onceFn);
    fn.apply(this, arguments);
  };
  el.addEventListener(event, onceFn, opts);
  return onceFn;
}

once(document.documentElement, "touchstart", function (e) {
  video.play();
  video.pause();
});

gsap.registerPlugin(ScrollTrigger);

// Reset video time to 0 on page load to ensure it starts from the beginning
window.addEventListener('load', () => {
  video.currentTime = 0;  // Ensure video starts from the beginning
});

let tl = gsap.timeline({
  defaults: { duration: 1, ease: "power1.inOut" },  // Added ease for smoothness
  scrollTrigger: {
    trigger: "#container",
    start: "top top",
    end: "bottom bottom",
    scrub: 1,  // Ensures smoother sync with scroll
    snap: 1 / 10,  // Snaps to 1/10th of the video length for smoother scrubbing
    markers: true,  // Enable markers for debugging
    onUpdate: (self) => {
      // Log scroll progress for debugging
      console.log("Scroll progress:", self.progress);
    },
    onComplete: function () {
      console.log("ScrollTrigger completed! Redirecting...");
      window.location.href = "./public/home.html";
    }
  }
});

once(video, "loadedmetadata", () => {
  // Dynamically set container height based on video duration
  let containerHeight = (video.duration * 100) + "vh";
  container.style.height = containerHeight;

  // Set up the video scrub
  tl.fromTo(
    video,
    { currentTime: 0 },
    { currentTime: video.duration || 1 }
  );

  // Trigger immediate fade-in and pop effect for the button
  const fadeInTime = video.duration - 1;  // 1 second before video ends

  // Make the button pop with opacity change and scaling
  gsap.to(towerBtn, { 
    opacity: 1, 
    scale: 1.2,  // Adds scaling effect for the "pop"
    duration: 0.5,  // Shortened duration for a faster effect
    ease: "back.out(1.7)",  // Smooth and immediate pop effect
    delay: fadeInTime  // This still ensures it triggers 1 second before the video ends
  });

  // When the video ends, you can either fade out the video or keep it as it is
  video.addEventListener('ended', function () {
    // Optional: Fade out video if desired
    // gsap.to([video, container], { opacity: 0, duration: 1 });

    // Ensure the button is already visible after the video ends
    console.log("Video ended, button is visible!");
  });
});

// Fetch the video again to ensure proper loading (if needed)
setTimeout(function () {
  if (window["fetch"]) {
    fetch(src)
      .then((response) => response.blob())
      .then((response) => {
        var blobURL = URL.createObjectURL(response);

        var t = video.currentTime;
        once(document.documentElement, "touchstart", function (e) {
          video.play();
          video.pause();
        });

        video.setAttribute("src", blobURL);
        video.currentTime = t + 0.01;
      });
  }
}, 1000);
