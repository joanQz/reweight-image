import { Observable, Observer } from 'rxjs';
import { flatMap } from 'rxjs/operators';

interface Base64blob {
  base64: string,
  blob: Blob
}

export class Reweight {
  static compressImage(image: File) {
    return Reweight.getUrlFromBlob(image).pipe(
      flatMap((base64image)=>{
        console.log(base64image);
        return new Observable(subscriber=>{
          subscriber.next(base64image);
        })
      })
    );
  }

  static getUrlFromBlob(image: Blob): Observable<string> {
    let reader = new FileReader();
    return Observable.create((observer: Observer<string|ArrayBuffer|null>)=>{
      reader.onload = () => {
        let res = reader.result;
        observer.next(res);
      }
      reader.readAsDataURL(image);
    });
  }
}
