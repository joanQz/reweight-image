import { Observable } from "rxjs";
import { atob } from 'abab';

import Blob = require('cross-blob');  // do not convert to default, test passes but throws an
                                      // error when package is imported

type Base64image = string;

export class Convert {
  getBase64FromBlob(image: Blob): Observable<Base64image> {
    let reader = new FileReader();
    return new Observable(observer=>{
      reader.onload = () => {
        let res = reader.result;
        observer.next(<Base64image>res);
        //res can be safely cast to string as we use readAsDataURL method
      }
      reader.readAsDataURL(image);
    });
  }


  // returned file is in jpeg format
  // From https://stackoverflow.com/questions/21227078/convert-base64-to-image-in-javascript-jquery
  // with litle modifications
  getBlobFromBase64(base64image: Base64image): Blob {
    let head = base64image.indexOf('base64,');
    if (head !== -1)
      base64image = base64image.substr(head+7);
    let sliceSize = 1024,
        byteCharacters = <Base64image>atob(base64image),
        // type can be safely cast to Base64image unless base64image is also null
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
