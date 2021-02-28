import { Observable, Observer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

interface Base64blob {
  base64: string,
  blob: Blob
}

export class Reweight {
  static compressImage(image: File) {
    return Reweight.getUrlFromBlob(image).pipe(
      mergeMap((base64image)=>{
        console.log(base64image);
        return new Observable(subscriber=>{
          subscriber.next(base64image);
        })
      })
    );
  }

  static getUrlFromBlob(image: Blob) {
    let reader = new FileReader();
    return new Observable(observer=>{
      reader.onload = () => {
        let res = reader.result;
        observer.next(res);
      }
      reader.readAsDataURL(image);
    });
  }
}
