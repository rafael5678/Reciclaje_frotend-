/** Sanitize and validate login fields. Names may use one space; passwords may not. */

class Credentials {
  sanitizeEmail(value: string): string {
    return value.replace(/\s+/g, "").toLowerCase();
  }

  sanitizePassword(value: string): string {
    return value.replace(/\s/g, "");
  }

  sanitizeName(value: string): string {
    return value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
  }

  finishName(value: string): string {
    return this.sanitizeName(value).trim();
  }

  nameError(value: string): string | null {
    const name = this.finishName(value);
    if (name.length < 2) return "Escribe tu nombre (como Rafael Calzada).";
    if (name.length > 80) return "El nombre es demasiado largo.";
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+(?: [A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/.test(name)) {
      return "Usa solo letras y un espacio entre nombres.";
    }
    if (name.split(" ").length > 5) return "El nombre tiene demasiadas palabras.";
    return null;
  }

  emailError(value: string): string | null {
    const email = this.sanitizeEmail(value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Escribe un correo válido, sin espacios.";
    return null;
  }

  passwordError(value: string): string | null {
    if (value.length < 6) return "Mínimo 6 caracteres, sin espacios.";
    if (value.length > 80) return "La contraseña es demasiado larga.";
    if (/\s/.test(value)) return "La contraseña no puede tener espacios.";
    return null;
  }
}

export const credentials = new Credentials();
