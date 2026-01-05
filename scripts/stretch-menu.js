// Stretch Menu - Vanilla JS with Three.js
(function() {
    'use strict';
  
    const LINKS = [
      "Home", "About", "Gallery", "Events", "Contact",
      "Home", "About", "Gallery", "Events", "Contact",
      "Home", "About", "Gallery", "Events", "Contact",
      "Home", "About", "Gallery", "Events", "Contact",
      "Home", "About", "Gallery", "Events", "Contact",
      "Home", "About", "Gallery", "Events", "Contact"
    ];
  
    const ITEM_HEIGHT = 70;
    const LOOP_HEIGHT = ITEM_HEIGHT * LINKS.length;
  
    // Vertex Shader
    const vertexShader = `
      uniform float uStretchFactor;
      uniform vec2 uViewportSizes;
      varying vec2 vUv;
  
      void main() {
        vUv = uv;
        vec3 newPosition = position;
        
        vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);
        vec4 viewPos = viewMatrix * worldPos;
        
        viewPos.y *= uStretchFactor;
  
        gl_Position = projectionMatrix * viewPos;
      }
    `;
  
    // Fragment Shader
    const fragmentShader = `
      uniform sampler2D uTexture;
      varying vec2 vUv;
  
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        if(color.a < 0.1) discard; 
        gl_FragColor = color;
      }
    `;
  
    // Texture Cache
    const textureCache = new Map();
  
    function createTextTexture(text, color = "white") {
      const cacheKey = `${text}-${color}`;
      
      if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
      }
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: true });
      
      canvas.width = 512;
      canvas.height = 128;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "400 60px Anton, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(text.toUpperCase(), 90, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      
      textureCache.set(cacheKey, texture);
      
      return texture;
    }
  
    // Stretch Item Class
    class StretchItem {
      constructor(text, index, velocityRef, positionRef, itemHeight, loopHeight, scene, camera) {
        this.text = text;
        this.index = index;
        this.velocityRef = velocityRef;
        this.positionRef = positionRef;
        this.itemHeight = itemHeight;
        this.loopHeight = loopHeight;
        this.scene = scene;
        this.camera = camera;
        this.isHovered = false;
  
        // Create textures
        this.whiteTexture = createTextTexture(text, "white");
        this.redTexture = createTextTexture(text, "#ff0000");
  
        // Create geometry
        const geometry = new THREE.PlaneGeometry(5, 1.2, 32, 32);
  
        // Create material
        this.material = new THREE.ShaderMaterial({
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          uniforms: {
            uTexture: { value: this.whiteTexture },
            uStretchFactor: { value: 1.0 },
            uViewportSizes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
          },
          transparent: true
        });
  
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.userData.itemIndex = index;
        this.scene.add(this.mesh);
      }
  
      setHovered(hovered) {
        this.isHovered = hovered;
      }
  
      update(viewport) {
        const velocity = this.velocityRef.current;
        const scrollDirection = Math.sign(velocity);
        
        const rawY = this.index * this.itemHeight - this.positionRef.current;
        let y = ((rawY % this.loopHeight) + this.loopHeight) % this.loopHeight;
        if (y > this.loopHeight / 2) y -= this.loopHeight;
        
        const viewportY = (y / window.innerHeight) * viewport.height * 2;
        
        const centerY = 0;
        const distanceFromCenter = Math.abs(viewportY - centerY);
        const maxDistance = viewport.height;
        
        let stretchFactor = 1.0;
        
        if (Math.abs(velocity) > 0.01) {
          const velocityMagnitude = Math.min(Math.abs(velocity), 10);
          const normalizedVelocity = velocityMagnitude / 40;
          
          if (scrollDirection > 0) {
            if (viewportY > centerY) {
              const distanceRatio = Math.min(distanceFromCenter / maxDistance, 1);
              stretchFactor = 1.0 - (distanceRatio * 1.5 * normalizedVelocity);
            } else {
              const distanceRatio = Math.min(distanceFromCenter / maxDistance, 1);
              const reverseFactor = 1.0 - distanceRatio;
              stretchFactor = 1.0 + (reverseFactor * 1.5 * normalizedVelocity);
            }
          } else {
            if (viewportY < centerY) {
              const distanceRatio = Math.min(distanceFromCenter / maxDistance, 1);
              stretchFactor = 1.0 - (distanceRatio * 1.5 * normalizedVelocity);
            } else {
              const distanceRatio = Math.min(distanceFromCenter / maxDistance, 1);
              const reverseFactor = 1.0 - distanceRatio;
              stretchFactor = 1.0 + (reverseFactor * 1.5 * normalizedVelocity);
            }
          }
        }
        
        stretchFactor = Math.max(0, Math.min(stretchFactor, 10));
        
        this.material.uniforms.uStretchFactor.value = THREE.MathUtils.lerp(
          this.material.uniforms.uStretchFactor.value,
          stretchFactor,
          0.15
        );
  
        this.material.uniforms.uViewportSizes.value.set(viewport.width, viewport.height);
        this.material.uniforms.uTexture.value = this.isHovered ? this.redTexture : this.whiteTexture;
        
        this.mesh.position.x = 0;
        this.mesh.position.y = viewportY;
        this.mesh.scale.set(1, 1, 1);
      }
  
      dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
      }
    }
  
    // Main Menu Class
    class StretchMenu {
      constructor() {
        this.overlay = document.getElementById('stretch-menu-overlay');
        this.canvasContainer = document.getElementById('stretch-canvas-container');
        this.closeBtn = document.getElementById('stretch-menu-close');
        this.hoverImagesContainer = document.getElementById('stretch-hover-images');
        
        this.isMobile = window.innerWidth < 768;
        this.isOpen = false;
        this.hoveredIndex = null;
        
        this.position = { current: 0 };
        this.velocity = { current: 0 };
        this.lastTime = 0;
        this.animationId = null;
        this.targetPosition = 0;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.items = [];
        this.hoverImageRefs = [];
        
        this.init();
      }
  
      init() {
        // Mobile check
        window.addEventListener('resize', () => {
          this.isMobile = window.innerWidth < 768;
          if (this.renderer) {
            this.onResize();
          }
        });
  
        // Close button
        this.closeBtn.addEventListener('click', () => this.close());
  
        // Create mobile menu items
        this.createMobileMenu();
        
        // Create hover images
        this.createHoverImages();
  
        // Setup Three.js if not mobile
        if (!this.isMobile) {
          this.setupThreeJS();
        }
      }
  
      createMobileMenu() {
        const mobileContainer = document.querySelector('.stretch-menu-mobile');
        if (!mobileContainer) return;
  
        LINKS.forEach((text, i) => {
          const item = document.createElement('div');
          item.className = 'stretch-mobile-item';
          item.innerHTML = `
            ${text}
            <div class="stretch-mobile-indicator"></div>
          `;
          item.addEventListener('click', () => this.close());
          mobileContainer.appendChild(item);
        });
      }
  
      createHoverImages() {
        LINKS.forEach((text, i) => {
          const hoverDiv = document.createElement('div');
          hoverDiv.className = 'stretch-hover-image';
          hoverDiv.addEventListener('mouseenter', () => this.handleMouseEnter(i));
          hoverDiv.addEventListener('mouseleave', () => this.handleMouseLeave(i));
          this.hoverImagesContainer.appendChild(hoverDiv);
          this.hoverImageRefs.push(hoverDiv);
        });
      }
  
      setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
  
        // Camera
        this.camera = new THREE.PerspectiveCamera(
          50,
          this.canvasContainer.clientWidth / this.canvasContainer.clientHeight,
          0.1,
          1000
        );
        this.camera.position.z = 5;
  
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
        this.canvasContainer.appendChild(this.renderer.domElement);
  
        // Raycaster for hover detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
  
        // Mouse move event
        this.canvasContainer.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvasContainer.addEventListener('click', (e) => this.onClick(e));
  
        // Create items
        this.items = LINKS.map((text, i) => {
          return new StretchItem(
            text, 
            i, 
            this.velocity, 
            this.position, 
            ITEM_HEIGHT, 
            LOOP_HEIGHT,
            this.scene,
            this.camera
          );
        });
  
        // Setup wheel and drag events
        this.setupWheelEvent();
        this.setupDragEvent();
  
        // Resize handler
        window.addEventListener('resize', () => this.onResize());
      }
  
      onResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = this.canvasContainer.clientWidth;
        const height = this.canvasContainer.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
  
      onMouseMove(event) {
        if (!this.renderer) return;
        
        const rect = this.canvasContainer.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children);
  
        if (intersects.length > 0) {
          const index = intersects[0].object.userData.itemIndex;
          if (this.hoveredIndex !== index) {
            if (this.hoveredIndex !== null) {
              this.items[this.hoveredIndex].setHovered(false);
            }
            this.hoveredIndex = index;
            this.items[index].setHovered(true);
            this.handleMouseEnter(index);
          }
        } else {
          if (this.hoveredIndex !== null) {
            this.items[this.hoveredIndex].setHovered(false);
            this.handleMouseLeave(this.hoveredIndex);
            this.hoveredIndex = null;
          }
        }
      }
  
      onClick(event) {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children);
  
        if (intersects.length > 0) {
          this.close();
        }
      }
  
      handleMouseEnter(index) {
        if (this.isMobile) return;
        
        const hoverImg = this.hoverImageRefs[index];
        if (hoverImg) {
          gsap.killTweensOf(hoverImg);
          gsap.set(hoverImg, { scale: 0, opacity: 0 });
          gsap.to(hoverImg, {
            scale: 1,
            opacity: 1,
            duration: 0.3,
            ease: "power2.out"
          });
        }
      }
  
      handleMouseLeave(index) {
        if (this.isMobile) return;
        
        const hoverImg = this.hoverImageRefs[index];
        if (hoverImg) {
          gsap.to(hoverImg, {
            scale: 0,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in"
          });
        }
      }
  
      setupWheelEvent() {
        let wheelTimeout = null;
        let accumulatedDeltaY = 0;
        let lastWheelTime = 0;
        
        const onWheel = (e) => {
          if (!this.isOpen) return;
          e.preventDefault();
          
          const now = Date.now();
          const timeDiff = now - lastWheelTime;
          lastWheelTime = now;
          
          const timeWeight = Math.min(timeDiff / 16, 2);
          accumulatedDeltaY += e.deltaY * timeWeight;
          
          const scrollSpeed = Math.abs(e.deltaY);
          const isFastScroll = scrollSpeed > 50;
          
          const speedMultiplier = isFastScroll ? 0.156 : 0.084;
          const baseVelocity = accumulatedDeltaY * speedMultiplier;
          
          const easingPower = isFastScroll ? 0.88 : 0.95;
          const easedVelocity = Math.sign(baseVelocity) * Math.pow(Math.abs(baseVelocity), easingPower);
          
          this.velocity.current += easedVelocity;
          
          const maxVelocity = isFastScroll ? 35 : 18;
          if (Math.abs(this.velocity.current) > maxVelocity) {
            this.velocity.current = Math.sign(this.velocity.current) * maxVelocity;
          }
          
          accumulatedDeltaY = 0;
          
          if (wheelTimeout) clearTimeout(wheelTimeout);
          wheelTimeout = setTimeout(() => {
            this.velocity.current *= 0.96;
            wheelTimeout = null;
          }, 100);
        };
        
        window.addEventListener("wheel", onWheel, { passive: false });
      }
  
      setupDragEvent() {
        let isDragging = false;
        let startY = 0;
        let startPosition = 0;
        let lastDragTime = 0;
        let lastDragY = 0;
        const dragVelocities = [];
        const MAX_VELOCITY_HISTORY = 5;
        
        const onMouseDown = (e) => {
          isDragging = true;
          startY = e.clientY;
          startPosition = this.position.current;
          lastDragY = e.clientY;
          lastDragTime = performance.now();
          dragVelocities.length = 0;
          this.velocity.current *= 0.3;
          this.targetPosition = this.position.current;
          this.canvasContainer.style.cursor = 'grabbing';
        };
        
        const onMouseMove = (e) => {
          if (!isDragging) return;
          
          const currentTime = performance.now();
          const deltaTime = Math.max(currentTime - lastDragTime, 1);
          const deltaY = lastDragY - e.clientY;
          const immediateVelocity = deltaY / deltaTime * 40;
          
          dragVelocities.push(immediateVelocity);
          if (dragVelocities.length > MAX_VELOCITY_HISTORY) {
            dragVelocities.shift();
          }
          
          this.position.current = startPosition + (startY - e.clientY) * 1.5;
          
          if (this.position.current < 0) this.position.current += LOOP_HEIGHT;
          else if (this.position.current > LOOP_HEIGHT) this.position.current -= LOOP_HEIGHT;
          
          this.targetPosition = this.position.current;
          lastDragY = e.clientY;
          lastDragTime = currentTime;
        };
        
        const onMouseUp = () => {
          if (!isDragging) return;
          
          if (dragVelocities.length > 0) {
            const avgVelocity = dragVelocities.reduce((a, b) => a + b, 0) / dragVelocities.length;
            this.velocity.current = avgVelocity * 0.7;
            
            const maxReleaseVelocity = 50;
            if (Math.abs(this.velocity.current) > maxReleaseVelocity) {
              this.velocity.current = Math.sign(this.velocity.current) * maxReleaseVelocity;
            }
          }
          
          isDragging = false;
          this.canvasContainer.style.cursor = 'grab';
        };
        
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      }
  
      startAnimation() {
        if (this.animationId) return;
        
        this.lastTime = performance.now();
        this.targetPosition = this.position.current;
        
        const animate = (currentTime) => {
          if (!this.animationId) return;
          
          const deltaTime = Math.min(currentTime - this.lastTime, 32) / 16;
          this.lastTime = currentTime;
          
          this.velocity.current *= 0.95;
          this.targetPosition += this.velocity.current * deltaTime;
          this.position.current += (this.targetPosition - this.position.current) * 0.06;
          
          if (this.position.current < 0) {
            this.position.current += LOOP_HEIGHT;
            this.targetPosition += LOOP_HEIGHT;
          }
          if (this.position.current > LOOP_HEIGHT) {
            this.position.current -= LOOP_HEIGHT;
            this.targetPosition -= LOOP_HEIGHT;
          }
  
          // Update all items
          if (this.camera && this.renderer) {
            const aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
            const vFov = this.camera.fov * Math.PI / 180;
            const height = 2 * Math.tan(vFov / 2) * this.camera.position.z;
            const width = height * aspect;
            
            const viewport = { width, height };
            
            this.items.forEach(item => item.update(viewport));
            this.renderer.render(this.scene, this.camera);
          }
          
          this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
      }
  
      stopAnimation() {
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
          this.animationId = null;
        }
        this.velocity.current = 0;
        this.targetPosition = this.position.current;
      }
  
      open() {
        this.isOpen = true;
        this.overlay.style.display = 'flex';
        
        gsap.to(this.overlay, {
          y: 0,
          autoAlpha: 1,
          duration: 1.2,
          ease: "power3.out",
          onStart: () => {
            if (!this.isMobile && this.renderer) {
              this.startAnimation();
            }
          }
        });
      }
  
      close() {
        this.isOpen = false;
        this.stopAnimation();
        
        gsap.to(this.overlay, {
          y: "100%",
          autoAlpha: 0,
          duration: 0.8,
          delay: 0.3,
          ease: "power3.in",
          onComplete: () => {
            this.overlay.style.display = 'none';
          }
        });
      }
    }
  
    // Initialize on DOM ready
    let stretchMenuInstance = null;
  
    function initStretchMenu() {
      if (!stretchMenuInstance) {
        stretchMenuInstance = new StretchMenu();
      }
    }
  
    // Expose global function to open menu
    window.openStretchMenu = function() {
      if (!stretchMenuInstance) {
        initStretchMenu();
      }
      stretchMenuInstance.open();
    };
  
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initStretchMenu);
    } else {
      initStretchMenu();
    }
  
  })();