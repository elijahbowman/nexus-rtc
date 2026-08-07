package com.nexusrtc.backend.controller;

import com.nexusrtc.backend.service.StorageFacade;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AttachmentController {

    private final StorageFacade storageFacade;

    public AttachmentController(StorageFacade storageFacade) {
        this.storageFacade = storageFacade;
    }

    /**
     * 🚀 HTTP MULTIPART FILE UPLOAD ENDPOINT
     * Receives raw media chunks, pipes them to MinIO, and returns the tracking keys.
     */
    @PostMapping("/upload")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadAttachment(@RequestParam("file") MultipartFile file) {
        try {
            // 1. Hand the binary stream to the Storage Facade layer to persist inside MinIO
            String uniqueFileKey = storageFacade.uploadFile(file);

            // 2. Extract content metadata to help the React frontend determine layout configurations
            String contentType = file.getContentType();

            // 3. Package metadata response variables
            Map<String, String> response = new HashMap<>();
            response.put("attachmentPath", uniqueFileKey);
            response.put("attachmentType", contentType);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("An unexpected error occurred during object processing: " + e.getMessage());
        }
    }
}