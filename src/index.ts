import { Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

interface Base64blob {
  base64: string,
  blob: Blob
}

type Base64image = string;

export class Reweight {

  compressImageFile(
                      fileImage: File,
                      limits: {
                        maxImageSize?: number,
                        jpegQuality?: number,
                        maxFileSizeMb?: number,
                        imageSizeRatio?: number,
                        jpegQualityRatio?: number
                      }
                    ) {
    let maxFileSize = limits.maxFileSizeMb? limits.maxFileSizeMb*1000000 : undefined;
    if (limits.maxFileSizeMb && !limits.imageSizeRatio)
      limits.imageSizeRatio = 0.99;
    if (limits.maxFileSizeMb && !limits.jpegQualityRatio)
      limits.jpegQualityRatio = 0.99;
    let maxImageSize = limits.maxImageSize || 10000, //provisional
        jpegQuality = limits.jpegQuality || 1;
    return this.getUrlFromBlob(fileImage).pipe(
      mergeMap((base64image)=>{
        return this.compressBase64Image(base64image, maxImageSize, jpegQuality);
      }),
      map((ret) => {
        let blob = this.getBlobFromUrl(<Base64image>ret)//WARNING error solved by a non-safely cast (or is it safe?)
        return new File([blob], fileImage.name, {type: 'image/jpeg'});
      })
    );
  }

  private compressBase64Image(
                                base64Image: string,
                                maxImageSize: number,
                                jpegQuality: number
                              ): Observable<Base64image> {
    return new Observable(observer=>{
      let imageElement: HTMLImageElement = document.createElement('img');
      imageElement.onload = () => {
        let resizedBase64Image = this.resizeImageElement(imageElement, maxImageSize, jpegQuality);
        observer.next(resizedBase64Image);
      }
      imageElement.src = base64Image;
    });
  }

  private resizeImageElement(
                              imageElement: HTMLImageElement,
                              maxImageSize: number,
                              jpegQuality: number
                            ): Base64image {
    const {width: imgWidth, height: imgHeight} = imageElement;
    const {scale: scale, xScale: xScale, yScale: yScale} =
                                      this.getScales(maxImageSize, imgWidth, imgHeight);

    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width  = xScale;
    canvas.height = yScale;
    let context: CanvasRenderingContext2D = <CanvasRenderingContext2D>(canvas.getContext('2d'));
    // type can be safely cast to CanvasRenderingContext2D as '2d' is a supported identifier
    context.scale(scale, scale);
    context.drawImage(imageElement, 0, 0);
    return canvas.toDataURL('image/jpeg', jpegQuality);
  }

  private  getScales(maxImageSize: number, imgWidth: number, imgHeight: number) {
    let widthScale  = maxImageSize / imgWidth,
        heightScale = maxImageSize / imgHeight;
    let scale = Math.max(widthScale, heightScale);

    if (scale > 1) {
      maxImageSize = Math.min(imgWidth, imgHeight)
      scale = 1
    }

    const growthScale: number = Math.max(widthScale, heightScale) / Math.min(widthScale, heightScale);
    let   xScale: number,
          yScale: number;

    if (imgWidth > imgHeight) {
      xScale = growthScale;
      yScale = 1;
    } else {
      xScale = 1;
      yScale = growthScale;
    }

    return {scale: scale, xScale: xScale * maxImageSize, yScale: yScale * maxImageSize};
  }


  getUrlFromBlob(image: Blob): Observable<string> {
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


  // returned file is in jpeg format
  // From https://stackoverflow.com/questions/21227078/convert-base64-to-image-in-javascript-jquery
  // with litle modifications
  getBlobFromUrl(base64image: Base64image): Blob {
    let head = base64image.indexOf('base64,');
    if (head !== -1)
      base64image = base64image.substr(head+7);
    let sliceSize = 1024,
        byteCharacters = atob(base64image),
        bytesLength = byteCharacters.length,
        slicesCount = Math.ceil(bytesLength / sliceSize),
        byteArrays = new Array(slicesCount);

    for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        let begin = sliceIndex * sliceSize,
            end = Math.min(begin + sliceSize, bytesLength),

            bytes = new Array(end - begin);
        for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    let blob = new Blob(byteArrays, { type: 'image/jpeg' });
    return blob;
  }
}
