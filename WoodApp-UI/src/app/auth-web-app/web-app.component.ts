import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-auth-web-app',
  templateUrl: './web-app.component.html',
  styleUrl: './web-app.component.css'
})
export class WebAppComponent {
//   private styleElements: HTMLLinkElement[] = [];

//   constructor(private renderer: Renderer2) { }

//   ngOnInit(): void {
//     // Inject Tailwind CSS
//     const tailwind = this.renderer.createElement('link');
//     tailwind.rel = 'stylesheet';
//     tailwind.href = 'assets/tailwind.min.css';
//     this.renderer.appendChild(document.head, tailwind);
//     this.styleElements.push(tailwind);

//     // Inject Font Awesome CSS
//     const fontawesome = this.renderer.createElement('link');
//     fontawesome.rel = 'stylesheet';
//     fontawesome.href = 'assets/fontawesome.min.css';
//     this.renderer.appendChild(document.head, fontawesome);
//     this.styleElements.push(fontawesome);
//   }

//   ngOnDestroy(): void {
//     // Remove injected styles
//     this.styleElements.forEach(el => {
//       this.renderer.removeChild(document.head, el);
//     });
//     this.styleElements = [];
//   }
}
