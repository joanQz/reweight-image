import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

interface Base64blob {
  base64: string,
  blob: Blob
}

export class Reweight {
  static compressImageFile(fileImage: File) {
    return Reweight.getUrlFromBlob(fileImage).pipe(
      mergeMap((base64image)=>{
        return Reweight.compressBase64Image(base64image);
      })
    );
  }

  private static compressBase64Image(base64Image: string): Observable<string> {
    return new Observable(observer=>{
      let imageElement: HTMLImageElement = document.createElement('img');
      imageElement.onload = () => {
        // let resizedImage = Reweight.resizeBase64Image(base64Image);
        let resizedImage = base64Image;
        observer.next(resizedImage);
      }
      imageElement.src = base64Image;
    });
  }


  static getUrlFromBlob(image: Blob): Observable<string> {
    let reader = new FileReader();
    return new Observable(observer=>{
      reader.onload = () => {
        let res = reader.result;
        observer.next(<string>res);
        //res can be safely cast to string as we use readAsDataURL method
      }
      reader.readAsDataURL(image);
    });
  }
}
