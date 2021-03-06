import { Component, OnInit, Output, EventEmitter } from '@angular/core';

import { Papa } from 'ngx-papaparse';
import { PapaParseResult } from '../../../../node_modules/ngx-papaparse/lib/interfaces/papa-parse-result';
import { MainService, CsvJson } from '../../services/main.service';
import { PapaParseConfig } from 'ngx-papaparse/lib/interfaces/papa-parse-config';

@Component({
  selector: 'hyp-csv-upload',
  template: `
    <span class="error" *ngIf="error">{{ error }}</span>
    <span class="success" *ngIf="success">Upload Successful!</span>
    <div class="upload" *ngIf="!currentResultJson && !loading">
      <button mat-raised-button color="accent" (click)="uploadCsv($event)">UPLOAD CSV</button>
      <input id="file-upload" mat-raised-button type="file" (change)="fileSelected($event.target.files)">
    </div>
    <div class="confirm" *ngIf="currentResultJson && !loading">
      <h2>Confirm Columns</h2>
      <h3>Click on a column to remove it from the upload</h3>
      <button mat-raised-button color="accent" (click)="confirmUpload()">LOOKS GOOD</button>
      <mat-list>
        <mat-list-item *ngFor="let column of confirmColumns">       
          <h4 mat-line (click)="column.enabled = !column.enabled">
            <i class="material-icons" mat-list-icon *ngIf="column.enabled">
              done
            </i>
            <i class="material-icons" mat-list-icon *ngIf="!column.enabled">
              close
            </i> 
            {{ column.columnName }}
          </h4>
        </mat-list-item>
      </mat-list>
    </div>
    <mat-spinner *ngIf="loading" color="accent"></mat-spinner>
  `,
  styleUrls: ['./csv-upload.component.scss']
})
export class CsvUploadComponent implements OnInit {
  error: string;
  currentResultJson: any;
  currentFileName: string;
  confirmColumns: { columnName: string, enabled: boolean }[];
  loading = false;
  success = false;
  @Output() uploadedFile = new EventEmitter<void>();

  constructor(
    private papa: Papa,
    private main: MainService
  ) { }

  ngOnInit() {
  }

  uploadCsv() {
    document.getElementById('file-upload').click();
  }

  fileSelected(files: FileList) {
    if (files.length > 1) return this.error = 'can only upload 1 file at a time!';
    this.success = false;
    const file: File = files[0];
    this.currentFileName = file.name;
    this.papa.parse(file, {
      header: true,
      complete: parsedResult => this.handleParsedJson(parsedResult),
      error: () => this.error = 'csv error'
    });
  }

  handleParsedJson(resultJson: any) {
    this.currentResultJson = resultJson;
    this.confirmColumns = resultJson.meta.fields.map(field => {
      return { columnName: field, enabled: true };
    });
  }

  confirmUpload() {
    const uploadJson = { ...this.currentResultJson };
    const ignoreColumns = new Set<string>();
    for (const column of this.confirmColumns) {
      if (!column.enabled) ignoreColumns.add(column.columnName);
    }

    if (ignoreColumns.size > 0) {
      uploadJson.meta.fields = uploadJson.meta.fields.filter(field => !ignoreColumns.has(field));
      uploadJson.data = uploadJson.data.map(row => {
        ignoreColumns.forEach(column => {
          delete row[column];
        });
        return row;
      });
    }

    uploadJson.meta['filename'] = this.currentFileName;
    uploadJson.meta['uploadDate'] = new Date().toLocaleString();

    // reset component fields
    this.error = null;
    this.currentResultJson = null;
    this.currentFileName = null;
    this.confirmColumns = null;

    // upload the json to the backend
    console.log('uploading file to backend: ', uploadJson);
    this.loading = true;
    this.main.uploadCsvJson(uploadJson)
      .subscribe(response => {
        console.log(response)
        this.loading = false;
        this.success = true;
        this.uploadedFile.emit();
      });
  }

}
