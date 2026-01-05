const container = document.querySelector(".items");

if (!container) {
  console.error("Container element with class 'items' not found!");
} else {
  let imageIndex = 1;
  let animationTimeout = null;
  let currentlyAnimating = false;

  function addNewItem(x, y) {
    const newItem = document.createElement("div");
    newItem.className = "item";

    const size = Math.max(window.innerWidth, window.innerHeight) * 0.13;
    newItem.style.width = `${size}px`;
    newItem.style.height = `${size}px`;
    newItem.style.left = `${x - size / 2}px`;
    newItem.style.top = `${y - size / 2}px`;

    const img = document.createElement("img");
    img.src = `../cursor_imgs/${imageIndex}.webp`;
    img.style.objectFit = "contain";
    img.style.overflow = "hidden";
    newItem.appendChild(img);

    imageIndex = (imageIndex % 16) + 1;

    container.appendChild(newItem);
    manageItemLimit();
  }

  function manageItemLimit() {
    while (container.children.length > 20) {
      container.removeChild(container.firstChild);
    }
  }

  function startAnimation() {
    if (currentlyAnimating || container.children.length === 0) return;
    currentlyAnimating = true;

    gsap.to(".item", {
      y: window.innerHeight * 1.5,
      scale: 1,
      opacity: 0,
      duration: 1,
      stagger: 0.025,
      onComplete: function () {
        this.targets().forEach((item) => {
          if (item.parentNode) {
            item.parentNode.removeChild(item);
          }
        });
        currentlyAnimating = false;
      },
    });
  }

  function handleMouseMove(event) {
    clearTimeout(animationTimeout);
    addNewItem(event.pageX, event.pageY);
    animationTimeout = setTimeout(startAnimation, 100);
  }

  function handleTouchMove(event) {
    clearTimeout(animationTimeout);
    const touch = event.touches[0];
    addNewItem(touch.pageX, touch.pageY);
    animationTimeout = setTimeout(startAnimation, 100);
  }

  container.addEventListener("mousemove", handleMouseMove);
  container.addEventListener("touchmove", handleTouchMove, { passive: true });

  // Resize handler for responsive scaling
  window.addEventListener("resize", () => {
    document.querySelectorAll(".item").forEach((item) => {
      const size = Math.max(window.innerWidth, window.innerHeight) * 0.08;
      item.style.width = `${size}px`;
      item.style.height = `${size}px`;
    });
  });
}
