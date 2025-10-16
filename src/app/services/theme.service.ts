import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // private themeSubject = new BehaviorSubject<ThemeMode>('system');
  private themeSubject = new BehaviorSubject<ThemeMode>('light');
  public theme$: Observable<ThemeMode> = this.themeSubject.asObservable();
  private temporaryTheme: ThemeMode | null = null;

  private isBrowser: boolean;
  private darkModeMediaQuery: MediaQueryList | null = null;
  private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    if (this.isBrowser) {
      // const storedTheme = localStorage.getItem('theme') as ThemeMode || 'system';
      const storedTheme = 'light';
      this.themeSubject.next(storedTheme);
      this.setupMediaQuery();
      this.applyTheme();
    }
  }

  private setupMediaQuery(): void {
    if (!this.isBrowser) return;

    this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this.mediaQueryListener = (e: MediaQueryListEvent) => {
      const currentTheme = this.temporaryTheme ?? this.themeSubject.value;
      if (currentTheme === 'system') {
        this.applySystemTheme();
      }
    };

    if (this.darkModeMediaQuery.addEventListener) {
      this.darkModeMediaQuery.addEventListener('change', this.mediaQueryListener);
    } else if (this.darkModeMediaQuery.addListener) {
      this.darkModeMediaQuery.addListener(this.mediaQueryListener);
    }
  }

  setTheme(theme: ThemeMode): void {
    if (!this.isBrowser) return;

    this.themeSubject.next(theme);
    localStorage.setItem('theme', theme);
    this.applyTheme();
  }

  setTemporaryTheme(theme: ThemeMode): void {
    this.temporaryTheme = theme;
    this.applyTheme();
  }

  clearTemporaryTheme(): void {
    this.temporaryTheme = null;
    this.applyTheme();
  }

  private applyTheme(): void {

    if (!this.isBrowser) return;

    const theme = this.temporaryTheme ?? this.themeSubject.value;

    if (theme === 'system') {
      this.applySystemTheme();
    } else {
      this.applySpecificTheme(theme);
    }
  }

  private applySystemTheme(): void {
    if (!this.isBrowser || !this.darkModeMediaQuery) return;

    const isDarkMode = this.darkModeMediaQuery.matches;
    this.applySpecificTheme(isDarkMode ? 'dark' : 'light');
  }

  private applySpecificTheme(theme: 'light' | 'dark'): void {
    if (!this.isBrowser) return;

    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-theme', theme);
    htmlElement.classList.toggle('dark-theme', theme === 'dark');
    htmlElement.classList.toggle('light-theme', theme === 'light');
  }

  get currentTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  get isDarkTheme(): boolean {
    if (!this.isBrowser) return false;

    const theme = this.temporaryTheme ?? this.themeSubject.value;
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return this.darkModeMediaQuery ? this.darkModeMediaQuery.matches : false;
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.darkModeMediaQuery && this.mediaQueryListener) {
      if (this.darkModeMediaQuery.removeEventListener) {
        this.darkModeMediaQuery.removeEventListener('change', this.mediaQueryListener);
      } else if (this.darkModeMediaQuery.removeListener) {
        this.darkModeMediaQuery.removeListener(this.mediaQueryListener);
      }
    }
  }
}