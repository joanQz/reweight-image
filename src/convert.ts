import { Observable } from "rxjs";
import { atob } from 'abab';

import Blob = require('cross-blob');  // do not convert to default, test passes but throws an
                                      // error when package is imported

type Base64data = string;

export class Convert {
  readonly BYTES_SLICE_SIZE = 1024

  getBase64FromBlob(image: Blob): Observable<Base64data> {
    let reader = new FileReader();
    return new Observable(observer=>{
      reader.onload = () => {
        let res = reader.result;
        observer.next(<Base64data>res);
        //res can be safely cast to string as we use readAsDataURL method
      }
      reader.readAsDataURL(image);
    });
  }


  // returned file is in jpeg format
  // From https://stackoverflow.com/questions/21227078/convert-base64-to-image-in-javascript-jquery
  // with litle modifications and refactoring
  getBlobFromBase64(base64data: Base64data): Blob {
    let actualData = this.getActualData(base64data),
        byteCharacters = <Base64data>atob(actualData),
        byteArrays = this.getByteArrays(byteCharacters),
        blob = new Blob(byteArrays, { type: 'image/jpeg' });
    return blob;
  }

  private getByteArrays(byteCharacters: string) {
    let byteArraysLength = this.getbyteArraysLength(byteCharacters),
        byteArrays = new Array(byteArraysLength);
    for (let sliceIndex = 0; sliceIndex < byteArraysLength; ++sliceIndex) {
        let begin = sliceIndex * this.BYTES_SLICE_SIZE,
            end = Math.min(begin + this.BYTES_SLICE_SIZE, byteCharacters.length),
            bytes = new Array(end - begin);
        for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return byteArrays;
  }

  private getbyteArraysLength(byteCharacters: string): number {
    return  Math.ceil(byteCharacters.length / this.BYTES_SLICE_SIZE);
  }

  private getActualData(base64data: Base64data): Base64data {
    let head = base64data.indexOf('base64,');
    if (head == -1)
      return base64data;
    return base64data.substr(head+7);
  }
}
